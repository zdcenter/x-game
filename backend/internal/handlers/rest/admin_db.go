package rest

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/pkg/db"
)

type dbTableInfo struct {
	Name     string `json:"name"`
	RowCount int64  `json:"row_count"`
	Size     string `json:"size"`
}

type dbBackupManifest struct {
	Version   string   `json:"version"`
	CreatedAt string   `json:"created_at"`
	Tables    []string `json:"tables"`
}

// GET /admin/db/tables — list all gm_ tables with row counts and sizes
func AdminDBTables(c fiber.Ctx) error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// pg_tables ensures every table appears even if pg_stat_user_tables hasn't collected stats yet
	rows, err := sqlDB.Query(`
		SELECT t.tablename,
		       COALESCE(s.n_live_tup, 0),
		       pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename)))
		FROM pg_tables t
		LEFT JOIN pg_stat_user_tables s ON s.relname = t.tablename AND s.schemaname = 'public'
		WHERE t.schemaname = 'public' AND t.tablename LIKE 'gm_%'
		ORDER BY t.tablename
	`)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	tables := make([]dbTableInfo, 0)
	for rows.Next() {
		var t dbTableInfo
		if err := rows.Scan(&t.Name, &t.RowCount, &t.Size); err != nil {
			continue
		}
		tables = append(tables, t)
	}
	return c.JSON(tables)
}

// POST /admin/db/backup/download — stream ZIP to browser
func AdminDBBackupDownload(c fiber.Ctx) error {
	tables, err := resolveDBBackupTables(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	buf, filename, err := buildBackupZip(tables)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Set("Content-Type", "application/zip")
	return c.Send(buf)
}

// POST /admin/db/backup/save — save ZIP to server-side BACKUP_DIR
func AdminDBBackupSave(c fiber.Ctx) error {
	tables, err := resolveDBBackupTables(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	buf, filename, err := buildBackupZip(tables)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	dir := dbBackupDir()
	if err := os.MkdirAll(dir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "cannot create backup directory"})
	}
	path := filepath.Join(dir, filename)
	if err := os.WriteFile(path, buf, 0644); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "cannot write backup file"})
	}
	info, _ := os.Stat(path)
	return c.JSON(fiber.Map{"filename": filename, "size": info.Size(), "tables": tables})
}

// GET /admin/db/backups — list saved backups
func AdminDBListBackups(c fiber.Ctx) error {
	dir := dbBackupDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return c.JSON([]interface{}{})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	type backupEntry struct {
		Name      string    `json:"name"`
		Size      int64     `json:"size"`
		CreatedAt time.Time `json:"created_at"`
		Tables    []string  `json:"tables"`
	}

	var result []backupEntry
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".zip") {
			continue
		}
		info, _ := e.Info()
		tables := dbReadManifestTables(filepath.Join(dir, e.Name()))
		result = append(result, backupEntry{
			Name:      e.Name(),
			Size:      info.Size(),
			CreatedAt: info.ModTime(),
			Tables:    tables,
		})
	}
	// Newest first
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})
	if result == nil {
		result = []backupEntry{}
	}
	return c.JSON(result)
}

// GET /admin/db/backups/:name/download — download a saved backup
func AdminDBDownloadSavedBackup(c fiber.Ctx) error {
	name := c.Params("name")
	if !dbSafeFilename(name) {
		return fiber.ErrBadRequest
	}
	path := filepath.Join(dbBackupDir(), name)
	return c.Download(path, name)
}

// DELETE /admin/db/backups/:name — delete a saved backup
func AdminDBDeleteBackup(c fiber.Ctx) error {
	name := c.Params("name")
	if !dbSafeFilename(name) {
		return fiber.ErrBadRequest
	}
	path := filepath.Join(dbBackupDir(), name)
	if err := os.Remove(path); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

// POST /admin/db/backup/inspect — multipart: file → return manifest without restoring
func AdminDBInspectBackup(c fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file required"})
	}
	f, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "cannot open file"})
	}
	defer f.Close()

	var raw bytes.Buffer
	raw.ReadFrom(f)
	zr, err := zip.NewReader(bytes.NewReader(raw.Bytes()), int64(raw.Len()))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid zip file"})
	}
	for _, zf := range zr.File {
		if zf.Name != "manifest.json" {
			continue
		}
		rc, err := zf.Open()
		if err != nil {
			break
		}
		var m dbBackupManifest
		json.NewDecoder(rc).Decode(&m)
		rc.Close()
		return c.JSON(m)
	}
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "manifest not found in zip"})
}

// POST /admin/db/restore — multipart: file + confirm + tables (optional JSON array)
func AdminDBRestore(c fiber.Ctx) error {
	if c.FormValue("confirm") != "CONFIRM" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "confirmation required"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file required"})
	}
	f, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "cannot open file"})
	}
	defer f.Close()

	var raw bytes.Buffer
	raw.ReadFrom(f)
	zr, err := zip.NewReader(bytes.NewReader(raw.Bytes()), int64(raw.Len()))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid zip file"})
	}

	// Optional table filter
	var requestedTables []string
	if tj := c.FormValue("tables"); tj != "" {
		json.Unmarshal([]byte(tj), &requestedTables)
	}

	// Build whitelist of valid gm_ tables
	validTables := dbGetAllGMTables()
	validSet := make(map[string]bool, len(validTables))
	for _, t := range validTables {
		validSet[t] = true
	}

	type tablePayload struct {
		name string
		data json.RawMessage
	}
	var toRestore []tablePayload

	for _, zf := range zr.File {
		if zf.Name == "manifest.json" {
			continue
		}
		tableName := strings.TrimSuffix(zf.Name, ".json")
		if !validSet[tableName] {
			continue
		}
		if len(requestedTables) > 0 && !dbSliceContains(requestedTables, tableName) {
			continue
		}
		rc, err := zf.Open()
		if err != nil {
			continue
		}
		var b bytes.Buffer
		b.ReadFrom(rc)
		rc.Close()
		toRestore = append(toRestore, tablePayload{name: tableName, data: json.RawMessage(b.Bytes())})
	}

	if len(toRestore) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no valid tables found in backup"})
	}

	// Restore inside a transaction
	tx := db.DB.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "cannot begin transaction"})
	}

	restored := make([]string, 0, len(toRestore))
	for _, td := range toRestore {
		if err := tx.Exec(fmt.Sprintf(`DELETE FROM "%s"`, td.name)).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": fmt.Sprintf("delete %s: %v", td.name, err),
			})
		}
		trimmed := strings.TrimSpace(string(td.data))
		if trimmed != "[]" && trimmed != "null" && trimmed != "" {
			sql := fmt.Sprintf(
				`INSERT INTO "%s" SELECT * FROM json_populate_recordset(null::"%s", $1::json)`,
				td.name, td.name,
			)
			if err := tx.Exec(sql, string(td.data)).Error; err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": fmt.Sprintf("insert %s: %v", td.name, err),
				})
			}
		}
		restored = append(restored, td.name)
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "commit failed: " + err.Error()})
	}

	// Reset auto-increment sequences after commit
	for _, table := range restored {
		db.DB.Exec(fmt.Sprintf(
			`SELECT setval(pg_get_serial_sequence('"%s"', 'id'), COALESCE((SELECT MAX(id) FROM "%s"), 1))`,
			table, table,
		))
	}

	return c.JSON(fiber.Map{"ok": true, "restored": restored})
}

// -------- internal helpers --------

func dbBackupDir() string {
	if d := os.Getenv("BACKUP_DIR"); d != "" {
		return d
	}
	return "./backups"
}

func dbSafeFilename(name string) bool {
	return strings.HasSuffix(name, ".zip") &&
		!strings.Contains(name, "/") &&
		!strings.Contains(name, "..") &&
		!strings.Contains(name, string(os.PathSeparator))
}

func dbGetAllGMTables() []string {
	var names []string
	db.DB.Raw(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'gm_%' ORDER BY tablename`).
		Pluck("tablename", &names)
	return names
}

func resolveDBBackupTables(c fiber.Ctx) ([]string, error) {
	var req struct {
		Tables []string `json:"tables"`
	}
	c.Bind().JSON(&req)

	allTables := dbGetAllGMTables()
	if len(req.Tables) == 0 || (len(req.Tables) == 1 && req.Tables[0] == "all") {
		return allTables, nil
	}

	validSet := make(map[string]bool, len(allTables))
	for _, t := range allTables {
		validSet[t] = true
	}
	var result []string
	for _, t := range req.Tables {
		if validSet[t] {
			result = append(result, t)
		}
	}
	if len(result) == 0 {
		return nil, fmt.Errorf("no valid tables specified")
	}
	return result, nil
}

func buildBackupZip(tables []string) ([]byte, string, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	manifest := dbBackupManifest{
		Version:   "1.0",
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		Tables:    tables,
	}
	mf, _ := zw.Create("manifest.json")
	json.NewEncoder(mf).Encode(manifest)

	sqlDB, err := db.DB.DB()
	if err != nil {
		zw.Close()
		return nil, "", err
	}

	for _, table := range tables {
		rows, err := sqlDB.Query(fmt.Sprintf(`SELECT row_to_json(t) FROM (SELECT * FROM "%s") t`, table))
		if err != nil {
			zw.Close()
			return nil, "", fmt.Errorf("query %s: %w", table, err)
		}

		var jsonRows []json.RawMessage
		for rows.Next() {
			var rowJSON json.RawMessage
			if err := rows.Scan(&rowJSON); err != nil {
				rows.Close()
				zw.Close()
				return nil, "", fmt.Errorf("scan %s: %w", table, err)
			}
			jsonRows = append(jsonRows, rowJSON)
		}
		rows.Close()

		var data []byte
		if len(jsonRows) == 0 {
			data = []byte("[]")
		} else {
			data, _ = json.Marshal(jsonRows)
		}

		f, _ := zw.Create(table + ".json")
		f.Write(data)
	}

	zw.Close()
	filename := fmt.Sprintf("backup_%s.zip", time.Now().Format("2006-01-02_15-04-05"))
	return buf.Bytes(), filename, nil
}

func dbReadManifestTables(zipPath string) []string {
	zr, err := zip.OpenReader(zipPath)
	if err != nil {
		return nil
	}
	defer zr.Close()
	for _, zf := range zr.File {
		if zf.Name != "manifest.json" {
			continue
		}
		rc, err := zf.Open()
		if err != nil {
			return nil
		}
		var m dbBackupManifest
		json.NewDecoder(rc).Decode(&m)
		rc.Close()
		return m.Tables
	}
	return nil
}

func dbSliceContains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

package domain

// SystemSetting represents a key-value configuration pair stored in the database.
type SystemSetting struct {
	Key   string `gorm:"primaryKey;type:varchar(100)" json:"key"`
	Value string `gorm:"type:text" json:"value"`
}

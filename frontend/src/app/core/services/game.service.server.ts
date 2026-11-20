import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { makeStateKey } from '@angular/core';
import { GameService, GameDoc, GAMES_DOCS_KEY } from './game.service';
import * as fs from 'node:fs';
import * as path from 'node:path';

function getDocsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'public/assets/docs'),
    path.resolve(process.cwd(), 'frontend/public/assets/docs'),
    path.resolve(process.cwd(), 'dist/frontend/browser/assets/docs'),
    path.resolve(process.cwd(), 'frontend/dist/frontend/browser/assets/docs'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return path.resolve(process.cwd(), 'public/assets/docs');
}

@Injectable()
export class ServerGameService extends GameService {
  private docsDir = getDocsDir();

  override getAllGamesDocs(): Observable<GameDoc[]> {
    if (this.transferState.hasKey(GAMES_DOCS_KEY)) {
      const docs = this.transferState.get(GAMES_DOCS_KEY, []);
      return of(docs);
    }
    try {
      const filePath = path.join(this.docsDir, 'index.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const docs: GameDoc[] = JSON.parse(raw);
        this.transferState.set(GAMES_DOCS_KEY, docs);
        return of(docs);
      }
    } catch (e) {
      console.error('[ServerGameService] Error reading docs index.json:', e);
    }
    return of([]);
  }

  override getGameDoc(id: string): Observable<GameDoc | null> {
    const docKey = makeStateKey<GameDoc | null>(`game-doc-${id}`);
    if (this.transferState.hasKey(docKey)) {
      const doc = this.transferState.get(docKey, null);
      return of(doc);
    }
    try {
      const filePath = path.join(this.docsDir, `${id}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const doc: GameDoc = JSON.parse(raw);
        this.transferState.set(docKey, doc);
        return of(doc);
      }
    } catch (e) {
      console.error(`[ServerGameService] Error reading game doc ${id}.json:`, e);
    }
    return of(null);
  }
}

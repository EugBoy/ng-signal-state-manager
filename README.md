# ng-signal-state-manager вљЎ

> РђРІС‚РѕРЅРѕРјРЅС‹Р№, Р»РµРіРєРѕРІРµСЃРЅС‹Р№ Рё С‚РёРїРѕР±РµР·РѕРїР°СЃРЅС‹Р№ СЃС‚РµР№С‚-РјРµРЅРµРґР¶РµСЂ Рё РєСЌС€ Р°СЃРёРЅС…СЂРѕРЅРЅС‹С… Р·Р°РїСЂРѕСЃРѕРІ РґР»СЏ Angular РЅР° Р±Р°Р·Рµ **Angular Signals** Рё **RxJS**.

[![Angular](https://img.shields.io/badge/Angular-%3E%3D17.0.0-DD0031.svg?style=flat&logo=angular)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## рџЊџ РљР»СЋС‡РµРІС‹Рµ РІРѕР·РјРѕР¶РЅРѕСЃС‚Рё

- рџљЂ **In-flight Deduplication**: Р•СЃР»Рё 10 РєРѕРјРїРѕРЅРµРЅС‚РѕРІ РѕРґРЅРѕРІСЂРµРјРµРЅРЅРѕ Р·Р°РїСЂР°С€РёРІР°СЋС‚ РѕРґРёРЅ Рё С‚РѕС‚ Р¶Рµ СЂРµСЃСѓСЂСЃ СЃ РѕРґРёРЅР°РєРѕРІС‹РјРё РїР°СЂР°РјРµС‚СЂР°РјРё, РѕС‚РїСЂР°РІР»СЏРµС‚СЃСЏ **СЃС‚СЂРѕРіРѕ 1 СЃРµС‚РµРІРѕР№ HTTP-Р·Р°РїСЂРѕСЃ**. Р’СЃРµ РѕСЃС‚Р°Р»СЊРЅС‹Рµ РєРѕРјРїРѕРЅРµРЅС‚С‹ РїРѕРґРєР»СЋС‡Р°СЋС‚СЃСЏ Рє РѕР±С‰РµРјСѓ СЂР°Р·РґРµР»СЏРµРјРѕРјСѓ РїРѕС‚РѕРєСѓ (`shareReplay({ bufferSize: 1, refCount: false })`).
- вљЎ **Angular Signals First**: Р’РѕР·РІСЂР°С‰Р°РµС‚ РіРѕС‚РѕРІС‹Рµ СЃРёРіРЅР°Р»С‹ `data()`, `isLoading()`, `isSuccess()`, `isError()`, `error()`. РќРёРєР°РєРёС… СЂСѓС‡РЅС‹С… РїРѕРґРїРёСЃРѕРє Рё СѓС‚РµС‡РµРє РїР°РјСЏС‚Рё.
- вЏ±пёЏ **TTL (Time To Live / Stale-Time)**: РњРіРЅРѕРІРµРЅРЅР°СЏ РѕС‚РґР°С‡Р° СЃРІРµР¶РёС… РґР°РЅРЅС‹С… РёР· РѕРїРµСЂР°С‚РёРІРЅРѕР№ РїР°РјСЏС‚Рё Р±РµР· РїРѕРІС‚РѕСЂРЅРѕРіРѕ РѕР±СЂР°С‰РµРЅРёСЏ Рє СЃРµС‚Рё.
- рџ§№ **РђРІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ СЃР±РѕСЂРєР° РјСѓСЃРѕСЂР° (Garbage Collection)**: РљРѕРіРґР° РІСЃРµ РєРѕРјРїРѕРЅРµРЅС‚С‹ СЂР°Р·РјРѕРЅС‚РёСЂСѓСЋС‚СЃСЏ (`subscribersCount === 0`), Р·Р°РїСѓСЃРєР°РµС‚СЃСЏ С‚Р°Р№РјРµСЂ `gcTime`, РїРѕ РёСЃС‚РµС‡РµРЅРёРё РєРѕС‚РѕСЂРѕРіРѕ РЅРµРёСЃРїРѕР»СЊР·СѓРµРјС‹Рµ РґР°РЅРЅС‹Рµ РѕС‡РёС‰Р°СЋС‚СЃСЏ РёР· РїР°РјСЏС‚Рё С‡РµСЂРµР· Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєСѓСЋ РїСЂРёРІСЏР·РєСѓ Рє `DestroyRef`.
- рџ› пёЏ **РћРїС‚РёРјРёСЃС‚РёС‡РЅС‹Рµ РѕР±РЅРѕРІР»РµРЅРёСЏ (`setData`)**: РњРіРЅРѕРІРµРЅРЅР°СЏ РјРѕРґРёС„РёРєР°С†РёСЏ РєСЌС€Р° Р±РµР· РѕР¶РёРґР°РЅРёСЏ РѕС‚РІРµС‚Р° СЃРµСЂРІРµСЂР°.
- рџ”‘ **Р”РµС‚РµСЂРјРёРЅРёСЂРѕРІР°РЅРЅС‹Рµ РєР»СЋС‡Рё**: РђРІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ Р»РµРєСЃРёРєРѕРіСЂР°С„РёС‡РµСЃРєР°СЏ СЃРѕСЂС‚РёСЂРѕРІРєР° РєР»СЋС‡РµР№ РѕР±СЉРµРєС‚РѕРІ (`{ a: 1, b: 2 }` Рё `{ b: 2, a: 1 }` РґР°СЋС‚ РёРґРµРЅС‚РёС‡РЅС‹Р№ РєР»СЋС‡).
- рџ“Љ **Р’СЃС‚СЂРѕРµРЅРЅС‹Рµ СЂРµР°РєС‚РёРІРЅС‹Рµ РјРµС‚СЂРёРєРё**: РћС‚СЃР»РµР¶РёРІР°РЅРёРµ С‡РёСЃР»Р° РѕР±СЂР°С‰РµРЅРёР№, РєСЌС€-С…РёС‚РѕРІ (`cacheHitsCount`), РґРµРґСѓРїР»РёРєР°С†РёР№ (`inFlightDeduplicationsCount`) Рё СЃСЌРєРѕРЅРѕРјР»РµРЅРЅС‹С… Р·Р°РїСЂРѕСЃРѕРІ (`savedRequestsCount`).

---

## рџ“¦ РЈСЃС‚Р°РЅРѕРІРєР°

```bash
npm install ng-signal-state-manager
```

Р›РёР±Рѕ Р»РѕРєР°Р»СЊРЅРѕ С‡РµСЂРµР· РѕС‚РЅРѕСЃРёС‚РµР»СЊРЅС‹Р№ РїСѓС‚СЊ РІ `package.json`:
```json
{
  "dependencies": {
    "ng-signal-state-manager": "file:../ng-signal-state-manager"
  }
}
```

### РўСЂРµР±РѕРІР°РЅРёСЏ
- Angular `>=17.0.0` (РїРѕР»РЅР°СЏ РїРѕРґРґРµСЂР¶РєР° Angular 17, 18, 19, 20, 21, 22+)
- RxJS `>=7.4.0`

---

## рџљЂ Р‘С‹СЃС‚СЂС‹Р№ СЃС‚Р°СЂС‚

### Р’Р°СЂРёР°РЅС‚ 1: РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ С‡РµСЂРµР· DI-С…РµР»РїРµСЂ `injectQuery` РІ РєРѕРјРїРѕРЅРµРЅС‚Рµ

```typescript
import { Component, input } from '@angular/core';
import { injectQuery } from 'ng-signal-state-manager';
import { UserApiService } from './user-api.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  template: `
    @if (userQuery.isLoading()) {
      <p>Р—Р°РіСЂСѓР·РєР° РґР°РЅРЅС‹С… РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ...</p>
    } @else if (userQuery.isError()) {
      <p>РћС€РёР±РєР°: {{ userQuery.error() }}</p>
      <button (click)="userQuery.refetch()">РџРѕРІС‚РѕСЂРёС‚СЊ</button>
    } @else if (userQuery.data(); as user) {
      <h2>{{ user.name }}</h2>
      <p>Email: {{ user.email }}</p>
    }
  `
})
export class UserProfileComponent {
  readonly userId = input.required<string>();
  private readonly userApi = inject(UserApiService);

  // РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРё РїРѕРґРєР»СЋС‡Р°РµС‚СЃСЏ Рє РєСЌС€Сѓ Рё РѕСЃРІРѕР±РѕР¶РґР°РµС‚ РїР°РјСЏС‚СЊ РїСЂРё СѓРЅРёС‡С‚РѕР¶РµРЅРёРё РєРѕРјРїРѕРЅРµРЅС‚Р°
  protected readonly userQuery = injectQuery(
    'users.byId',
    (id: string) => this.userApi.getUserById(id),
    [this.userId()],
    { ttl: 60_000, gcTime: 300_000 }
  );
}
```

---

### Р’Р°СЂРёР°РЅС‚ 2: РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ С‡РµСЂРµР· С„Р°СЃР°РґРЅС‹Р№ СЃС‚РѕСЂ (Р РµРєРѕРјРµРЅРґСѓРµС‚СЃСЏ РґР»СЏ РјР°СЃС€С‚Р°Р±РёСЂСѓРµРјС‹С… РїСЂРѕРµРєС‚РѕРІ)

```typescript
import { inject, Injectable } from '@angular/core';
import { SignalQueryCache, QueryResult } from 'ng-signal-state-manager';
import { HttpClient } from '@angular/common/http';

export interface User {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(SignalQueryCache);

  getUser(id: string): QueryResult<User> {
    return this.cache.query(
      'users.get',
      (userId: string) => this.http.get<User>(`/api/users/${userId}`),
      [id],
      { ttl: 5 * 60 * 1000 } // РљСЌС€ Р°РєС‚СѓР°Р»РµРЅ 5 РјРёРЅСѓС‚
    );
  }

  updateOptimistically(id: string, newName: string): void {
    const query = this.getUser(id);
    query.setData((prev) => (prev ? { ...prev, name: newName } : null));
  }

  invalidateUser(id: string): void {
    this.cache.invalidate(`users.get:${JSON.stringify(id)}`);
  }
}
```

---

## рџ“– РЎРїСЂР°РІРѕС‡РЅРёРє API

### `QueryResult<T>`
РРЅС‚РµСЂС„РµР№СЃ, РІРѕР·РІСЂР°С‰Р°РµРјС‹Р№ РјРµС‚РѕРґР°РјРё `query()` Рё `injectQuery()`:

| РџРѕР»Рµ | РўРёРї | РћРїРёСЃР°РЅРёРµ |
| :--- | :--- | :--- |
| `data` | `Signal<T \| null>` | РЎРёРіРЅР°Р» С‚РѕР»СЊРєРѕ РґР»СЏ С‡С‚РµРЅРёСЏ СЃ РєСЌС€РёСЂРѕРІР°РЅРЅС‹РјРё РґР°РЅРЅС‹РјРё |
| `status` | `Signal<QueryStatus>` | `'idle'` \| `'loading'` \| `'success'` \| `'error'` |
| `error` | `Signal<unknown \| null>` | РЎРёРіРЅР°Р» СЃ РѕР±СЉРµРєС‚РѕРј РѕС€РёР±РєРё |
| `isLoading` | `Signal<boolean>` | `true`, РµСЃР»Рё РІС‹РїРѕР»РЅСЏРµС‚СЃСЏ СЃРµС‚РµРІРѕР№ Р·Р°РїСЂРѕСЃ |
| `isSuccess` | `Signal<boolean>` | `true`, РµСЃР»Рё Р·Р°РїСЂРѕСЃ Р·Р°РІРµСЂС€РёР»СЃСЏ СѓСЃРїРµС…РѕРј |
| `isError` | `Signal<boolean>` | `true`, РµСЃР»Рё Р·Р°РїСЂРѕСЃ СѓРїР°Р» СЃ РѕС€РёР±РєРѕР№ |
| `refetch()` | `() => Observable<T>` | РџСЂРёРЅСѓРґРёС‚РµР»СЊРЅС‹Р№ РїРµСЂРµР·Р°РїСѓСЃРє СЃРµС‚РµРІРѕРіРѕ Р·Р°РїСЂРѕСЃР° |
| `setData()` | `(updater) => void` | РћРїС‚РёРјРёСЃС‚РёС‡РЅРѕРµ РѕР±РЅРѕРІР»РµРЅРёРµ РґР°РЅРЅС‹С… РєСЌС€Р° Р±РµР· HTTP |
| `lastUpdated()` | `() => number` | Timestamp РїРѕСЃР»РµРґРЅРµРіРѕ СѓСЃРїРµС€РЅРѕРіРѕ РѕР±РЅРѕРІР»РµРЅРёСЏ (РјСЃ) |

---

### `QueryOptions<T>`
РћРїС†РёРё РєРѕРЅС„РёРіСѓСЂР°С†РёРё Р·Р°РїСЂРѕСЃР°:

| РЎРІРѕР№СЃС‚РІРѕ | РўРёРї | РџРѕ СѓРјРѕР»С‡Р°РЅРёСЋ | РћРїРёСЃР°РЅРёРµ |
| :--- | :--- | :--- | :--- |
| `ttl` | `number` | `60_000` (1 РјРёРЅ) | Р’СЂРµРјСЏ Р°РєС‚СѓР°Р»СЊРЅРѕСЃС‚Рё (Stale Time) РІ РјСЃ |
| `gcTime` | `number` | `300_000` (5 РјРёРЅ) | Р’СЂРµРјСЏ С…СЂР°РЅРµРЅРёСЏ РІ РїР°РјСЏС‚Рё РїРѕСЃР»Рµ РѕС‚РєР»СЋС‡РµРЅРёСЏ РїРѕРґРїРёСЃС‡РёРєРѕРІ |
| `forceFetch` | `boolean` | `false` | РџСЂРёРЅСѓРґРёС‚РµР»СЊРЅРѕ РёРіРЅРѕСЂРёСЂРѕРІР°С‚СЊ РєСЌС€ Рё РёРґС‚Рё РІ СЃРµС‚СЊ |
| `initialData` | `T \| null` | `null` | РќР°С‡Р°Р»СЊРЅРѕРµ Р·РЅР°С‡РµРЅРёРµ РґРѕ Р·Р°РІРµСЂС€РµРЅРёСЏ Р·Р°РїСЂРѕСЃР° |
| `onSuccess` | `(data: T) => void` | `undefined` | РљРѕР»Р»Р±СЌРє РїСЂРё СѓСЃРїРµС…Рµ |
| `onError` | `(error: unknown) => void` | `undefined` | РљРѕР»Р»Р±СЌРє РїСЂРё РѕС€РёР±РєРµ |

---

## рџ“„ Р›РёС†РµРЅР·РёСЏ

[MIT](LICENSE) В© 2026 Evgen

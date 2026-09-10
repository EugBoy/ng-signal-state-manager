# ng-signal-state-manager ⚡

**English** | [Русский](README_RU.md)

> Standalone, lightweight, and type-safe async query cache and state manager for Angular powered by **Angular Signals** and **RxJS**.

[![Angular](https://img.shields.io/badge/Angular-%3E%3D17.0.0-DD0031.svg?style=flat&logo=angular)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Key Features

- 🚀 **In-flight Deduplication**: If multiple components request the same resource concurrently with identical parameters, **strictly 1 HTTP network request** is executed. All other consumers subscribe to the same shared stream (`shareReplay({ bufferSize: 1, refCount: false })`).
- ⚡ **Angular Signals First**: Returns reactive signals out of the box: `data()`, `isLoading()`, `isSuccess()`, `isError()`, `error()`. No manual subscriptions, no boilerplate, zero memory leaks.
- ⏱️ **TTL (Time To Live / Stale-Time)**: Instantly serves fresh cached data from memory without redundant network roundtrips.
- 🧹 **Automatic Garbage Collection**: When all consumer components unmount (`subscribersCount === 0`), a `gcTime` timer starts. Once expired, unused cache entries are pruned from memory via automatic `DestroyRef` lifecycle binding.
- 🛠️ **Optimistic Updates (`setData`)**: Instantly mutate cached state without waiting for a server response.
- 🔑 **Deterministic Cache Keys**: Object parameters are sorted lexicographically (`{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` produce identical keys).
- 📊 **Built-in Reactive Metrics**: Track total queries, cache hits (`cacheHitsCount`), in-flight deduplications (`inFlightDeduplicationsCount`), and saved network requests (`savedRequestsCount`).

---

## 📦 Installation

```bash
npm install ng-signal-state-manager
```

Or locally via a relative path in `package.json`:
```json
{
  "dependencies": {
    "ng-signal-state-manager": "file:../ng-signal-state-manager"
  }
}
```

### Requirements
- Angular `>=17.0.0` (Full support for Angular 17, 18, 19, 20, 21, 22+)
- RxJS `>=7.4.0`

---

## 🚀 Quick Start

### Approach 1: Component level using `injectQuery` DI helper

```typescript
import { Component, input, inject } from '@angular/core';
import { injectQuery } from 'ng-signal-state-manager';
import { UserApiService } from './user-api.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  template: `
    @if (userQuery.isLoading()) {
      <p>Loading user profile...</p>
    } @else if (userQuery.isError()) {
      <p>Error: {{ userQuery.error() }}</p>
      <button (click)="userQuery.refetch()">Retry</button>
    } @else if (userQuery.data(); as user) {
      <h2>{{ user.name }}</h2>
      <p>Email: {{ user.email }}</p>
    }
  `
})
export class UserProfileComponent {
  readonly userId = input.required<string>();
  private readonly userApi = inject(UserApiService);

  // Automatically connects to cache and cleans up memory on component destroy
  protected readonly userQuery = injectQuery(
    'users.byId',
    (id: string) => this.userApi.getUserById(id),
    [this.userId()],
    { ttl: 60_000, gcTime: 300_000 }
  );
}
```

---

### Approach 2: Using a Store / Service Facade (Recommended for scalable apps)

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
      { ttl: 5 * 60 * 1000 } // Cache valid for 5 minutes
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

## 📖 API Reference

### `QueryResult<T>`
Interface returned by `query()` and `injectQuery()`:

| Property | Type | Description |
| :--- | :--- | :--- |
| `data` | `Signal<T \| null>` | Read-only signal containing the cached data |
| `status` | `Signal<QueryStatus>` | `'idle'` \| `'loading'` \| `'success'` \| `'error'` |
| `error` | `Signal<unknown \| null>` | Signal containing the error object, if any |
| `isLoading` | `Signal<boolean>` | `true` when a network request is currently in flight |
| `isSuccess` | `Signal<boolean>` | `true` when the request resolved successfully |
| `isError` | `Signal<boolean>` | `true` when the request failed with an error |
| `refetch()` | `() => Observable<T>` | Imperatively re-triggers the network request |
| `setData()` | `(updater) => void` | Optimistically updates cached data without an HTTP call |
| `lastUpdated()` | `() => number` | Timestamp (ms) of the last successful data fetch |

---

### `QueryOptions<T>`
Query configuration options:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `ttl` | `number` | `60_000` (1 min) | Time To Live (stale time) in ms |
| `gcTime` | `number` | `300_000` (5 min) | Retention duration in memory after all subscribers unmount |
| `forceFetch` | `boolean` | `false` | Force bypass cache and always perform network request |
| `initialData` | `T \| null` | `null` | Initial value before request completes |
| `onSuccess` | `(data: T) => void` | `undefined` | Callback invoked on successful query completion |
| `onError` | `(error: unknown) => void` | `undefined` | Callback invoked on query error |

---

## 📄 License

[MIT](LICENSE) © 2026 Evgen

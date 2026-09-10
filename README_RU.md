# ng-signal-state-manager ⚡

[English](README.md) | **Русский**

> Автономный, легковесный и типобезопасный стейт-менеджер и кэш асинхронных запросов для Angular на базе **Angular Signals** и **RxJS**.

[![Angular](https://img.shields.io/badge/Angular-%3E%3D17.0.0-DD0031.svg?style=flat&logo=angular)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Ключевые возможности

- 🚀 **In-flight Deduplication**: Если 10 компонентов одновременно запрашивают один и тот же ресурс с одинаковыми параметрами, отправляется **строго 1 сетевой HTTP-запрос**. Все остальные компоненты подключаются к общему разделяемому потоку (`shareReplay({ bufferSize: 1, refCount: false })`).
- ⚡ **Angular Signals First**: Возвращает готовые сигналы `data()`, `isLoading()`, `isSuccess()`, `isError()`, `error()`. Никаких ручных подписок и утечек памяти.
- ⏱️ **TTL (Time To Live / Stale-Time)**: Мгновенная отдача свежих данных из оперативной памяти без повторного обращения к сети.
- 🧹 **Автоматическая сборка мусора (Garbage Collection)**: Когда все компоненты размонтируются (`subscribersCount === 0`), запускается таймер `gcTime`, по истечении которого неиспользуемые данные очищаются из памяти через автоматическую привязку к `DestroyRef`.
- 🛠️ **Оптимистичные обновления (`setData`)**: Мгновенная модификация кэша без ожидания ответа сервера.
- 🔑 **Детерминированные ключи**: Автоматическая лексикографическая сортировка ключей объектов (`{ a: 1, b: 2 }` и `{ b: 2, a: 1 }` дают идентичный ключ).
- 📊 **Встроенные реактивные метрики**: Отслеживание числа обращений, кэш-хитов (`cacheHitsCount`), дедупликаций (`inFlightDeduplicationsCount`) и сэкономленных запросов (`savedRequestsCount`).

---

## 📦 Установка

```bash
npm install ng-signal-state-manager
```

Либо локально через относительный путь в `package.json`:
```json
{
  "dependencies": {
    "ng-signal-state-manager": "file:../ng-signal-state-manager"
  }
}
```

### Требования
- Angular `>=17.0.0` (полная поддержка Angular 17, 18, 19, 20, 21, 22+)
- RxJS `>=7.4.0`

---

## 🚀 Быстрый старт

### Вариант 1: Использование через DI-хелпер `injectQuery` в компоненте

```typescript
import { Component, input, inject } from '@angular/core';
import { injectQuery } from 'ng-signal-state-manager';
import { UserApiService } from './user-api.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  template: `
    @if (userQuery.isLoading()) {
      <p>Загрузка данных пользователя...</p>
    } @else if (userQuery.isError()) {
      <p>Ошибка: {{ userQuery.error() }}</p>
      <button (click)="userQuery.refetch()">Повторить</button>
    } @else if (userQuery.data(); as user) {
      <h2>{{ user.name }}</h2>
      <p>Email: {{ user.email }}</p>
    }
  `
})
export class UserProfileComponent {
  readonly userId = input.required<string>();
  private readonly userApi = inject(UserApiService);

  // Автоматически подключается к кэшу и освобождает память при уничтожении компонента
  protected readonly userQuery = injectQuery(
    'users.byId',
    (id: string) => this.userApi.getUserById(id),
    [this.userId()],
    { ttl: 60_000, gcTime: 300_000 }
  );
}
```

---

### Вариант 2: Использование через фасадный стор (Рекомендуется для масштабируемых проектов)

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
      { ttl: 5 * 60 * 1000 } // Кэш актуален 5 минут
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

## 📖 Справочник API

### `QueryResult<T>`
Интерфейс, возвращаемый методами `query()` и `injectQuery()`:

| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `data` | `Signal<T \| null>` | Сигнал только для чтения с кэшированными данными |
| `status` | `Signal<QueryStatus>` | `'idle'` \| `'loading'` \| `'success'` \| `'error'` |
| `error` | `Signal<unknown \| null>` | Сигнал с объектом ошибки |
| `isLoading` | `Signal<boolean>` | `true`, если выполняется сетевой запрос |
| `isSuccess` | `Signal<boolean>` | `true`, если запрос завершился успехом |
| `isError` | `Signal<boolean>` | `true`, если запрос упал с ошибкой |
| `refetch()` | `() => Observable<T>` | Принудительный перезапуск сетевого запроса |
| `setData()` | `(updater) => void` | Оптимистичное обновление данных кэша без HTTP |
| `lastUpdated()` | `() => number` | Timestamp последнего успешного обновления (мс) |

---

### `QueryOptions<T>`
Опции конфигурации запроса:

| Свойство | Тип | По умолчанию | Описание |
| :--- | :--- | :--- | :--- |
| `ttl` | `number` | `60_000` (1 мин) | Время актуальности (Stale Time) в мс |
| `gcTime` | `number` | `300_000` (5 мин) | Время хранения в памяти после отключения подписчиков |
| `forceFetch` | `boolean` | `false` | Принудительно игнорировать кэш и идти в сеть |
| `initialData` | `T \| null` | `null` | Начальное значение до завершения запроса |
| `onSuccess` | `(data: T) => void` | `undefined` | Коллбэк при успехе |
| `onError` | `(error: unknown) => void` | `undefined` | Коллбэк при ошибке |

---

## 📄 Лицензия

[MIT](LICENSE) © 2026 Evgen

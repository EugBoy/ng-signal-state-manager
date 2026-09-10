import { DestroyRef, inject } from '@angular/core';
import { buildCacheKey } from './cache-key.utils';
import { QueryFetcher, QueryOptions, QueryResult } from './query.types';
import { SignalQueryCache } from './signal-query-cache.service';

/**
 * Хелпер для использования `SignalQueryCache` в контексте внедрения зависимостей Angular (DI).
 *
 * Автоматически связывается с `DestroyRef` текущего компонента, директивы или сервиса:
 * 1. Увеличивает счётчик активных подписчиков (`retain`) при создании.
 * 2. При уничтожении контекста (`onDestroy`) уменьшает счётчик (`release`),
 *    запуская сборку мусора (`gcTime`) для удаления неиспользуемых данных из памяти.
 *
 * @template T Тип кэшируемых данных.
 * @template Args Кортеж типов аргументов запроса.
 * @param namespace Уникальное имя операции (например, `'users.getById'`).
 * @param fetcher Функция, возвращающая `Observable<T>`.
 * @param args Аргументы, передаваемые в функцию `fetcher`.
 * @param options Дополнительные параметры (TTL, GC, коллбэки).
 * @returns Интерфейс `QueryResult<T>` с сигналами только для чтения и методами управления.
 *
 * @example
 * ```ts
 * @Component({ ... })
 * export class UserBadgeComponent {
 *   private readonly userApi = inject(UserApiService);
 *   protected readonly userQuery = injectQuery(
 *     'users.byId',
 *     (id: string) => this.userApi.getUserById(id),
 *     [this.userId]
 *   );
 * }
 * ```
 */
export function injectQuery<T, Args extends readonly unknown[]>(
  namespace: string,
  fetcher: QueryFetcher<T, Args>,
  args: Args,
  options: QueryOptions<T> = {}
): QueryResult<T> {
  const cache = inject(SignalQueryCache);
  const destroyRef = inject(DestroyRef, { optional: true });
  const key = buildCacheKey(namespace, args);

  const result = cache.query(namespace, fetcher, args, options);

  // Регистрируем активного подписчика (запись гарантированно создана)
  cache.retain(key);

  if (destroyRef) {
    destroyRef.onDestroy(() => {
      // Снимаем регистрацию при размонтировании
      cache.release(key, options.gcTime);
    });
  }

  return result;
}

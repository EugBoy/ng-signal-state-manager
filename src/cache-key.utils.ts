/**
 * Utilities for deterministic serialization of cache keys.
 *
 * Provides a stable and reproducible string representation for any query arguments,
 * including objects with arbitrary property order, nested arrays, dates, and primitives.
 *
 * ---
 * 🇷🇺 **RU**: Утилиты для детерминированной сериализации ключей кэша.
 * Обеспечивают стабильное и воспроизводимое строковое представление любых аргументов запроса.
 */

/**
 * Recursively performs deterministic serialization of an arbitrary value into a stable string.
 *
 * Key features:
 * - Object properties are sorted alphabetically: `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` yield identical results.
 * - Handles `null` and `undefined` as literal strings `'null'` and `'undefined'`.
 * - `Date` objects are converted to ISO strings.
 * - Array elements are serialized preserving order.
 *
 * ---
 * 🇷🇺 **RU**: Рекурсивно выполняет детерминированную сериализацию произвольного значения в стабильную строку.
 *
 * Ключевые особенности:
 * - Свойства объектов сортируются в алфавитном порядке: `{ a: 1, b: 2 }` и `{ b: 2, a: 1 }` дают идентичный результат.
 * - Обработка `null` и `undefined` как строковых литералов `'null'` и `'undefined'`.
 * - Объекты `Date` преобразуются в ISO-строку.
 * - Элементы массивов сериализуются с сохранением порядка следования.
 *
 * @param keyPart Value to serialize (primitive, array, object, date, etc.) / Сериализуемое значение.
 * @returns Deterministic key string / Детерминированная строка ключа.
 *
 * @example
 * ```ts
 * serializeKeyPart({ b: 2, a: 1 }); // '{"a":1,"b":2}'
 * ```
 */
export function serializeKeyPart(keyPart: unknown): string {
  if (keyPart === null) {
    return 'null';
  }

  if (keyPart === undefined) {
    return 'undefined';
  }

  if (typeof keyPart !== 'object') {
    return JSON.stringify(keyPart);
  }

  if (keyPart instanceof Date) {
    return JSON.stringify(keyPart.toISOString());
  }

  if (Array.isArray(keyPart)) {
    const serializedItems = keyPart.map((item) => serializeKeyPart(item));
    return `[${serializedItems.join(',')}]`;
  }

  // Sort object keys lexicographically for determinism / Сортируем ключи объекта в лексикографическом порядке
  const sortedKeys = Object.keys(keyPart as Record<string, unknown>).sort();
  const serializedProperties = sortedKeys.map((key) => {
    const value = (keyPart as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${serializeKeyPart(value)}`;
  });

  return `{${serializedProperties.join(',')}}`;
}

/**
 * Builds a unique composite cache key string from a namespace and arguments.
 *
 * Key format: `namespace:serializedArg1:serializedArg2:...`
 *
 * ---
 * 🇷🇺 **RU**: Формирует уникальный композитный строковый ключ кэша на основе пространства имён и аргументов.
 * Формат ключа: `namespace:serializedArg1:serializedArg2:...`
 *
 * @param namespace Entity or operation name (e.g. `'users.getById'` or `'geo.city'`) / Имя сущности или операции.
 * @param args Tuple of arguments passed to the query / Кортеж аргументов запроса.
 * @returns Unique deterministic string key / Уникальный детерминированный строковый ключ.
 *
 * @example
 * ```ts
 * buildCacheKey('users.list', [{ page: 1, limit: 10 }]);
 * // 'users.list:{"limit":10,"page":1}'
 * ```
 */
export function buildCacheKey(namespace: string, args: readonly unknown[] = []): string {
  const normalizedNamespace = namespace.trim();
  if (args.length === 0) {
    return normalizedNamespace;
  }

  const serializedArgs = args.map((arg) => serializeKeyPart(arg)).join(':');
  return `${normalizedNamespace}:${serializedArgs}`;
}

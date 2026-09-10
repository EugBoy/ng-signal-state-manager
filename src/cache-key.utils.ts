/**
 * Утилиты для детерминированной сериализации ключей кэша.
 *
 * Обеспечивают стабильное и воспроизводимое строковое представление любых аргументов запроса,
 * включая объекты с произвольным порядком свойств, вложенные массивы, даты и примитивы.
 */

/**
 * Рекурсивно выполняет детерминированную сериализацию произвольного значения в стабильную строку.
 *
 * Ключевые особенности:
 * - Свойства объектов сортируются в алфавитном порядке: `{ a: 1, b: 2 }` и `{ b: 2, a: 1 }` дают идентичный результат.
 * - Обработка `null` и `undefined` как строковых литералов `'null'` и `'undefined'`.
 * - Объекты `Date` преобразуются в ISO-строку.
 * - Элементы массивов сериализуются с сохранением порядка следования.
 *
 * @param keyPart Сериализуемое значение (примитив, массив, объект, дата и т.д.).
 * @returns Детерминированная строка ключа.
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

  // Сортируем ключи объекта в лексикографическом порядке для детерминированности
  const sortedKeys = Object.keys(keyPart as Record<string, unknown>).sort();
  const serializedProperties = sortedKeys.map((key) => {
    const value = (keyPart as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${serializeKeyPart(value)}`;
  });

  return `{${serializedProperties.join(',')}}`;
}

/**
 * Формирует уникальный композитный строковый ключ кэша на основе пространства имён и аргументов.
 *
 * Формат ключа: `namespace:serializedArg1:serializedArg2:...`
 *
 * @param namespace Имя сущности или операции (например, `'users.getById'` или `'geo.city'`).
 * @param args Кортеж аргументов, передаваемых в запрос.
 * @returns Уникальный детерминированный строковый ключ.
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

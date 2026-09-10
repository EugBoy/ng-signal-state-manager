/**
 * Публичный API автономного модуля стейт-менеджера и кэша запросов `SignalQueryCache`.
 *
 * Эту папку (`app/core/state-manager`) можно целиком копировать в любой Angular-проект
 * или оформлять как независимую npm-библиотеку.
 */

export * from './query.types';
export * from './cache-key.utils';
export * from './signal-query-cache.service';
export * from './inject-query';

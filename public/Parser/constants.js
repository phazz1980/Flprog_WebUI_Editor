/**
 * Константы ino2ubi — конвертер Arduino в блоки FLProg
 */
export const VERSION = '1.7.9';
/** Дата последнего обновления (подставляется автоматически при push в main) */
export const LAST_UPDATED = '2026-03-06T11:01:44Z';

export const PRIMITIVE_TYPES = new Set([
  'int', 'long', 'unsigned long', 'bool', 'boolean', 'float', 'double',
  'byte', 'char', 'String', 'uint8_t', 'int16_t', 'uint16_t', 'int32_t', 'uint32_t'
]);

export const TYPE_MAPPING = {
  'int': 'IntegerDataType',
  'long': 'LongDataType',
  'unsigned long': 'LongDataType',
  'bool': 'BooleanDataType',
  'boolean': 'BooleanDataType',
  'float': 'FloatDataType',
  'double': 'FloatDataType',
  'byte': 'ByteDataType',
  'char': 'CharDataType',
  'String': 'StringDataType',
  'uint8_t': 'ByteDataType',
  'int16_t': 'IntegerDataType',
  'uint16_t': 'IntegerDataType',
  'int32_t': 'LongDataType',
  'uint32_t': 'LongDataType'
};

export function getTypeClassName(varType) {
  return TYPE_MAPPING[varType] || 'IntegerDataType';
}

if (typeof window !== 'undefined') {
  window.VERSION = VERSION;
  window.LAST_UPDATED = LAST_UPDATED;
  window.PRIMITIVE_TYPES = PRIMITIVE_TYPES;
  window.TYPE_MAPPING = TYPE_MAPPING;
  window.getTypeClassName = getTypeClassName;
}

export type AccentColorType = 'accent';
export type HierarchicalColorType = 'primary' | 'secondary';
export type SemanticColorType = 'success' | 'process' | 'warning' | 'danger';
export type TransparentColorType = 'transparent';

export type CommonColorsType = AccentColorType | HierarchicalColorType | SemanticColorType | TransparentColorType;

export type IPropsMapper<T> = Record<string, T>;

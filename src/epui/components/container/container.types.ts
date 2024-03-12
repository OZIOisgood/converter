export type ContainerClassNameType = string;

export interface Container {
  className: ContainerClassNameType;
}

export const DefaultContainer: Container = {
  className: 'container mx-auto max-w-5xl pt-4 px-4 sm:px-10'
};

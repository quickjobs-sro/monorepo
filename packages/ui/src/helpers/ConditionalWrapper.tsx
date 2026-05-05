type ConditionalWrapperProps = {
  condition: boolean;
  wrapper: (children: React.ReactNode) => JSX.Element;
  children: React.ReactNode;
};

export function ConditionalWrapper({ condition, wrapper, children }: ConditionalWrapperProps) {
  return condition ? wrapper(children) : <>{children}</>;
}

import { Toggle as $Toggle } from "@saleor/macaw-ui/next";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";

// ! ToggleProps is not exported from macaw-ui
type $ToggleProps = React.ComponentProps<typeof $Toggle>;

export type ToggleProps<T extends FieldValues = FieldValues> = Omit<$ToggleProps, "name"> & {
  name: FieldPath<T>;
  control: Control<T>;
};

export function Toggle<TFieldValues extends FieldValues = FieldValues>({
  type,
  name,
  control,
  ...rest
}: ToggleProps<TFieldValues>): JSX.Element {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, ...field } }) => (
        <$Toggle {...rest} {...field} value={value || ""} name={name} type={type} />
      )}
    />
  );
}

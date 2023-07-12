import { zodResolver } from "@hookform/resolvers/zod";
import { useDashboardNotification } from "@saleor/apps-shared";
import { Box, Button, Text } from "@saleor/macaw-ui/next";
import { Input } from "@saleor/react-hook-form-macaw";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { StrapiProviderConfig } from "../../configuration";
import { printSaleorProductFields } from "../../configuration/print-saleor-product-fields";
import { trpcClient } from "../../trpc/trpc-client";
import { ButtonsBox } from "../../ui/buttons-box";

type FormShape = Omit<StrapiProviderConfig.InputShape, "type">;

// todo extract where schema is
const mappingFieldsNames: Array<keyof FormShape["productVariantFieldsMapping"]> = [
  "name",
  "productId",
  "productName",
  "productSlug",
  "variantId",
  "channels",
];

type PureFormProps = {
  defaultValues: FormShape;
  onSubmit(values: FormShape): void;
  onDelete?(): void;
};

const PureForm = ({ defaultValues, onSubmit, onDelete }: PureFormProps) => {
  const {
    control,
    getValues,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormShape>({
    defaultValues: defaultValues,
    resolver: zodResolver(StrapiProviderConfig.Schema.Input.omit({ type: true })),
  });

  return (
    <Box
      as="form"
      display={"grid"}
      gap={4}
      onSubmit={handleSubmit((vals) => {
        onSubmit(vals);
      })}
    >
      <Input
        required
        control={control}
        name="configName"
        label="Configuration name"
        helperText="Meaningful name that will help you understand it later. E.g. 'staging' or 'prod' "
      />

      <Box display={"grid"} gap={4} marginY={4}>
        <Text variant="heading">Provide conntection details</Text>
        <Input required control={control} name="authToken" label="Auth token" helperText="todo" />
        <Input required control={control} name="url" label="API Url" helperText="todo" />
      </Box>
      <Box display={"grid"} gap={4} marginY={4}>
        <Text variant="heading">Configure fields mapping</Text>
        <Input label="Item type" name="itemType" control={control} helperText="todo" />

        <Text as="p" variant="heading" size="small">
          Map fields from Saleor to your contentful schema.
        </Text>
        <Text as="p" marginTop={2} marginBottom={4}>
          All fields should be type of <Text variant="bodyStrong">Text</Text>. Channels should be
          type of <Text variant="bodyStrong">JSON</Text>.
        </Text>
        <Box
          marginBottom={4}
          display="grid"
          __gridTemplateColumns={"50% 50%"}
          borderBottomWidth={1}
          borderBottomStyle="solid"
          borderColor="neutralHighlight"
          padding={2}
        >
          <Text variant="caption">Saleor Field</Text>
          <Text variant="caption">Contentful field</Text>
        </Box>
        {mappingFieldsNames.map((saleorField) => (
          // todo extract this table to component
          <Box
            display="grid"
            __gridTemplateColumns={"50% 50%"}
            padding={2}
            key={saleorField}
            alignItems="center"
          >
            <Box>
              <Text as="p" variant="bodyStrong">
                {printSaleorProductFields(saleorField)}
              </Text>
              <Text variant="caption">
                {saleorField === "channels" ? "JSON field" : "Text field"}
              </Text>
            </Box>
            <Input
              size="small"
              control={control}
              name={`productVariantFieldsMapping.${saleorField}`}
              label="Strapi Field"
            />
          </Box>
        ))}
      </Box>
      <ButtonsBox>
        {onDelete && (
          <Button onClick={onDelete} variant="tertiary">
            Delete
          </Button>
        )}
        <Button type="submit">Save</Button>
      </ButtonsBox>
    </Box>
  );
};

const AddFormVariant = () => {
  const { push } = useRouter();
  const { notifySuccess } = useDashboardNotification();
  const { mutate: addProvider } = trpcClient.providersConfigs.addOne.useMutation({
    onSuccess() {
      notifySuccess("Success", "Updated configuration");
      push("/configuration");
    },
  });

  return (
    <PureForm
      onSubmit={(values) => {
        addProvider({
          ...values,
          type: "strapi",
        });
      }}
      defaultValues={{
        configName: "",
        authToken: "",
        url: "",
        itemType: "",
        productVariantFieldsMapping: {
          channels: "",
          name: "",
          productId: "",
          productName: "",
          productSlug: "",
          variantId: "",
        },
      }}
    />
  );
};

const EditFormVariant = (props: { configId: string }) => {
  const { push } = useRouter();
  const { notifySuccess } = useDashboardNotification();

  const { data } = trpcClient.providersConfigs.getOne.useQuery(
    {
      id: props.configId,
    },
    {
      enabled: !!props.configId,
    }
  );
  const { mutate } = trpcClient.providersConfigs.updateOne.useMutation({
    onSuccess() {
      notifySuccess("Success", "Updated configuration");
      push("/configuration");
    },
  });

  const { mutate: deleteProvider } = trpcClient.providersConfigs.deleteOne.useMutation({
    onSuccess() {
      notifySuccess("Success", "Removed configuration");
      push("/configuration");
    },
  });

  if (!data) {
    return null;
  }

  if (data.type !== "strapi") {
    throw new Error("Trying to fill strapi form with non strapi data");
  }

  return (
    <PureForm
      onDelete={() => {
        deleteProvider({
          id: props.configId,
        });
      }}
      onSubmit={(values) => {
        mutate({
          ...values,
          type: "strapi",
          id: props.configId,
        });
      }}
      defaultValues={data}
    />
  );
};

/*
 * todo make the same with contentful
 * todo improve copy
 */
export const StrapiConfigForm = {
  PureVariant: PureForm,
  AddVariant: AddFormVariant,
  EditVariant: EditFormVariant,
};

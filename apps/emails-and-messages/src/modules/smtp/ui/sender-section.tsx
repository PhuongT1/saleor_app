import { SmtpConfiguration } from "../configuration/smtp-config-schema";
import { BoxWithBorder } from "../../../components/box-with-border";
import { Box, Button } from "@saleor/macaw-ui/next";
import { defaultPadding } from "../../../components/ui-defaults";
import { useDashboardNotification } from "@saleor/apps-shared";
import { trpcClient } from "../../trpc/trpc-client";
import { useForm } from "react-hook-form";
import { BoxFooter } from "../../../components/box-footer";
import { SectionWithDescription } from "../../../components/section-with-description";
import {
  SmtpUpdateSender,
  smtpUpdateSenderSchema,
} from "../configuration/smtp-config-input-schema";
import { Input } from "../../../components/react-hook-form-macaw/Input";
import { zodResolver } from "@hookform/resolvers/zod";
import { setBackendErrors } from "../../../lib/set-backend-errors";

interface SenderSectionProps {
  configuration: SmtpConfiguration;
}

export const SenderSection = ({ configuration }: SenderSectionProps) => {
  const { notifySuccess, notifyError } = useDashboardNotification();
  const { handleSubmit, control, setError, register } = useForm<SmtpUpdateSender>({
    defaultValues: {
      id: configuration.id,
      senderName: configuration.senderName,
      senderEmail: configuration.senderEmail,
    },
    resolver: zodResolver(smtpUpdateSenderSchema),
  });

  const trpcContext = trpcClient.useContext();
  const { mutate } = trpcClient.smtpConfiguration.updateSender.useMutation({
    onSuccess: async () => {
      notifySuccess("Configuration saved");
      trpcContext.smtpConfiguration.invalidate();
    },
    onError(error) {
      setBackendErrors<SmtpUpdateSender>({
        error,
        setError,
        notifyError,
      });
    },
  });

  return (
    <SectionWithDescription title="Sender">
      <BoxWithBorder>
        <form
          onSubmit={handleSubmit((data, event) => {
            mutate({
              ...data,
            });
          })}
        >
          <Box padding={defaultPadding} display="flex" flexDirection="column" gap={10}>
            <Input
              label="Email"
              name="senderEmail"
              control={control}
              helperText="Email address that will be used as sender"
            />
            <Input
              label="Name"
              name="senderName"
              control={control}
              helperText="Name that will be used as sender"
            />
          </Box>
          <BoxFooter>
            <Button type="submit">Save provider</Button>
          </BoxFooter>
        </form>
      </BoxWithBorder>
    </SectionWithDescription>
  );
};

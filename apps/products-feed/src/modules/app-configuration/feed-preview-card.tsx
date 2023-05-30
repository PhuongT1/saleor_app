import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { Box, Button, Input, PropsWithBox, Text } from "@saleor/macaw-ui/next";

interface FeedPreviewCardProps {
  channelSlug: string;
}

export const FeedPreviewCard = ({ channelSlug, ...props }: PropsWithBox<FeedPreviewCardProps>) => {
  const { appBridge, appBridgeState } = useAppBridge();

  if (!appBridgeState) {
    return null;
  }

  // todo extract and test
  const googleFeedUrl = `${window.location.origin}/api/feed/${encodeURIComponent(
    appBridgeState.saleorApiUrl as string
  )}/${channelSlug}/google.xml`;

  const openUrlInNewTab = async (url: string) => {
    await appBridge?.dispatch(actions.Redirect({ to: url, newContext: true }));
  };

  return (
    <Box {...props}>
      <Text variant={"heading"} as={"h2"} marginBottom={4}>
        Test your feed
      </Text>
      <Input
        label="Google feed URL"
        value={googleFeedUrl}
        onFocus={(e) => {
          e.target.select();
        }}
        helperText="Dedicated URL for your Google Merchant Feed. Click to select and copy."
      />

      <Box display={"flex"} justifyContent={"flex-end"}>
        <Button variant="secondary" onClick={() => openUrlInNewTab(googleFeedUrl)} marginTop={6}>
          Open feed in a new tab
        </Button>
      </Box>
    </Box>
  );
};

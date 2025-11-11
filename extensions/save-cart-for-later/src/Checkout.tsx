import {
  reactExtension,
  useApi,
  useCartLines,
  BlockStack,
  Checkbox,
  Button,
  Form,
  Banner,
} from '@shopify/ui-extensions-react/checkout';
import { useState } from 'react';

type SaveForLaterItemPayload = {
  lineId: string;
  productId: string;
  title: string;
  quantity: number;
};

export default reactExtension('purchase.checkout.block.render', () => (
  <SaveCart />
));

function SaveCart() {
  const { extension, sessionToken, } = useApi();
  const cartLines = useCartLines();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(false);

  if (cartLines.length === 0) {
    return null;
  }

  const appBaseUrl = new URL(extension.scriptUrl).origin;

  const toggle = (lineId: string) => {
    setSelected((prev) => ({
      ...prev,
      [lineId]: !prev[lineId],
    }));
  };

  const handleSubmit = async () => {
    if (loading) return;

    setLoading(true);

    const items: SaveForLaterItemPayload[] = cartLines
      .filter((line) => selected[line.id])
      .map((line) => {
        const merch = line.merchandise;

        if (merch.type !== 'variant') return null;

        return {
          lineId: line.id,
          productId: merch.id,
          title: merch.title,
          quantity: line.quantity,
        };
      })
      .filter((item): item is SaveForLaterItemPayload => item !== null);

    if (!items.length) {
      setLoading(false);
      return;
    }
    const token = await sessionToken.get();
    try {
      const res = await fetch(`${appBaseUrl}/api/save-cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        console.error('Save-cart request failed', await res.text());
      }

      setSelected({});
    } catch (error) {
      console.error('Failed to save cart', error);
    } finally {
      setLoading(false);
    }
  };


  return (


    <Banner
      status='info'
      title="Save your cart."
    >
      <Form
        onSubmit={handleSubmit}
      >

        <BlockStack spacing="tight" inlineAlignment="start" padding="base">

          <BlockStack spacing="extraTight">
            {cartLines.map((line) => (
              <Checkbox
                key={line.id}
                checked={!!selected[line.id]}
                onChange={() => toggle(line.id)}
              >
                {line.merchandise.type === 'variant'
                  ? line.merchandise.title
                  : 'Item'}
              </Checkbox>
            ))}
          </BlockStack>


          <Button
            accessibilityRole="submit"
            loading={loading}
            disabled={!Object.values(selected).some(Boolean)}
          >
            Save
          </Button>

        </BlockStack>
      </Form>

    </Banner>


  );

}

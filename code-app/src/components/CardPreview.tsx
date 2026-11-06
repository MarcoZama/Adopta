import { Avatar, Button, Caption1, Text } from "@fluentui/react-components";
import { Eye20Regular } from "@fluentui/react-icons";
import type { CardLanguage } from "../data/types";
import { useI18n } from "../i18n";
import { CARD_BUTTONS } from "../i18n/messages";
import { Section } from "./Section";

interface CardPreviewProps {
  agentName: string;
  logoUrl?: string;
  title: string;
  body: string;
  cardMessage: string;
  /** Language of the communication: the buttons are in this language, whatever the app language. */
  language: CardLanguage;
}

/** Approximation of the Teams card sent by the delivery flow. */
export function CardPreview({ agentName, logoUrl, title, body, cardMessage, language }: CardPreviewProps) {
  const { t } = useI18n();
  const buttons = CARD_BUTTONS[language];
  return (
    <Section className="preview" icon={<Eye20Regular />} title={t.preview.title} hint={t.preview.hint}>
      <div className="preview-stage">
        <div className="preview-chat">
          <Avatar
            name={agentName}
            image={logoUrl ? { src: logoUrl } : undefined}
            color="brand"
            size={32}
            shape="square"
          />
          <div className="preview-bubble">
            <Caption1 className="muted">{agentName}</Caption1>
            <div className="preview-card">
              <Text weight="semibold" size={400} className="preview-title">
                {title.trim() || t.preview.titlePlaceholder}
              </Text>
              <Text className={`preview-body${body.trim() ? "" : " placeholder"}`}>
                {body.trim() || t.preview.bodyPlaceholder}
              </Text>
              {/* The buttons post a message to the agent in the chat (AdoptaScheduleCommunication, Build_card). */}
              <div className="preview-buttons">
                <Button appearance="secondary" size="small" tabIndex={-1}>
                  {buttons.more}
                </Button>
                <Button appearance="secondary" size="small" tabIndex={-1}>
                  {buttons.ignore}
                </Button>
              </div>
              {cardMessage.trim() && <Text className="preview-body">{cardMessage.trim()}</Text>}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

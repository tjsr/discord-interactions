import {
  APIInteractionResponseChannelMessageWithSource,
  APIInteractionResponseUpdateMessage,
  APIMessage,
  APIMessageComponentButtonInteraction,
  APIMessageComponentInteraction,
  APIMessageComponentSelectMenuInteraction,
  InteractionResponseType
} from "discord-api-types/v10";
import { WebhookClient, WebhookEditMessageOptions, WebhookMessageOptions } from "discord.js";
import {
  DiscordApplication,
  InteractionResponseAlreadySent,
  InteractionTokenExpired,
  MessageBuilder,
  ResponseCallback,
  SimpleEmbed
} from "..";
import { MessageUpdateResponse } from "../util";
import { InteractionContext } from "./InteractionContext";

class BaseComponentContext<
  T extends APIMessageComponentInteraction = APIMessageComponentInteraction
> extends InteractionContext<T, MessageUpdateResponse> {
  private webhook: WebhookClient;

  public id: string;
  public args: string[];

  constructor(manager: DiscordApplication, interaction: T, responseCallback: ResponseCallback<MessageUpdateResponse>) {
    super(manager, interaction, responseCallback);

    this.webhook = new WebhookClient({
      id: this.interaction.application_id,
      token: this.interaction.token
    });

    this.args = this.interaction.data.custom_id.split("|");

    if (this.args.length === 0) throw new Error("Component ID not found.");
    this.id = this.args.shift() as string;
  }

  defer(): Promise<void> {
    if (this.replied) throw new InteractionResponseAlreadySent(this.interaction);

    return this._reply({
      type: InteractionResponseType.DeferredMessageUpdate
    });
  }

  reply(message: string | MessageBuilder | APIInteractionResponseUpdateMessage): Promise<void> {
    if (this.replied) throw new InteractionResponseAlreadySent(this.interaction);

    if (typeof message === "string") message = SimpleEmbed(message);

    if (message instanceof MessageBuilder)
      message = {
        type: InteractionResponseType.UpdateMessage,
        data: message.toJSON()
      };

    return this._reply(message);
  }

  async editMessage(message: string | MessageBuilder | APIInteractionResponseUpdateMessage): Promise<APIMessage> {
    if (this.expired) throw new InteractionTokenExpired(this.interaction);

    if (typeof message === "string") message = SimpleEmbed(message);

    if (message instanceof MessageBuilder)
      message = {
        type: InteractionResponseType.UpdateMessage,
        data: message.toJSON()
      };

    // TODO: write webhook client or wait for discord.js to update
    return this.webhook.editMessage(
      "@original",
      message.data as WebhookEditMessageOptions
    ) as unknown as Promise<APIMessage>;
  }

  async sendMessage(
    message: string | MessageBuilder | APIInteractionResponseChannelMessageWithSource
  ): Promise<APIMessage> {
    if (this.expired) throw new InteractionTokenExpired(this.interaction);

    if (typeof message === "string") message = SimpleEmbed(message);

    if (message instanceof MessageBuilder)
      message = {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: message.toJSON()
      };

    // TODO: fix this it's messy
    return this.webhook.send(message.data as WebhookMessageOptions) as unknown as Promise<APIMessage>;
  }
}

export class ButtonContext extends BaseComponentContext<APIMessageComponentButtonInteraction> {}

export class SelectMenuContext extends BaseComponentContext<APIMessageComponentSelectMenuInteraction> {
  public values: string[];

  constructor(
    manager: DiscordApplication,
    interaction: APIMessageComponentSelectMenuInteraction,
    responseCallback: ResponseCallback<MessageUpdateResponse>
  ) {
    super(manager, interaction, responseCallback);

    this.values = this.interaction.data.values;
  }
}

export type ComponentContext = ButtonContext | SelectMenuContext;

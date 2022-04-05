import {
  APIApplicationCommandInteraction,
  APIInteractionResponseChannelMessageWithSource,
  APIMessage,
  InteractionResponseType
} from "discord-api-types/v10";
import { WebhookClient, WebhookEditMessageOptions, WebhookMessageOptions } from "discord.js";
import {
  ChannelMessageResponse,
  DiscordApplication,
  InteractionResponseAlreadySent,
  InteractionTokenExpired,
  MessageBuilder,
  ResponseCallback,
  SimpleEmbed
} from "../..";
import { InteractionContext } from "../InteractionContext";

export class BaseCommandContext<
  T extends APIApplicationCommandInteraction = APIApplicationCommandInteraction
> extends InteractionContext<T, ChannelMessageResponse> {
  public name: string;
  private webhook: WebhookClient;

  constructor(manager: DiscordApplication, interaction: T, responseCallback: ResponseCallback<ChannelMessageResponse>) {
    super(manager, interaction, responseCallback);

    this.name = this.interaction.data.name;

    this.webhook = new WebhookClient({
      id: this.interaction.application_id,
      token: this.interaction.token
    });
  }

  defer(): Promise<void> {
    if (this.replied) throw new InteractionResponseAlreadySent(this.interaction);

    return this._reply({
      type: InteractionResponseType.DeferredChannelMessageWithSource
    });
  }

  reply(message: string | MessageBuilder | APIInteractionResponseChannelMessageWithSource): Promise<void> {
    if (typeof message === "string") message = SimpleEmbed(message);

    if (message instanceof MessageBuilder)
      message = {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: message.toJSON()
      };

    return this._reply(message);
  }

  async editMessage(
    message: string | MessageBuilder | APIInteractionResponseChannelMessageWithSource,
    id = "@original"
  ): Promise<APIMessage> {
    if (this.expired) throw new InteractionTokenExpired(this.interaction);

    if (typeof message === "string") message = SimpleEmbed(message);

    if (message instanceof MessageBuilder)
      message = {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: message.toJSON()
      };

    // TODO: fix this it's messy
    return this.webhook.editMessage(id, message.data as WebhookEditMessageOptions) as unknown as Promise<APIMessage>;
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

import { ValueObject } from "@/domain-driven-design";

const DISCORD_CDN = "https://cdn.discordapp.com";

interface UserAvatarUrlProps {
  url: string;
}

export class UserAvatarUrl extends ValueObject<UserAvatarUrlProps> {
  private constructor(props: UserAvatarUrlProps) {
    super(props);
  }

  static fromUser(discordId: string, avatar: string | null): UserAvatarUrl {
    const url = avatar
      ? `${DISCORD_CDN}/avatars/${discordId}/${avatar}.png?size=64`
      : `${DISCORD_CDN}/embed/avatars/${Number(discordId) % 5}.png`;
    return new UserAvatarUrl({ url });
  }

  get url(): string {
    return this.props.url;
  }
}

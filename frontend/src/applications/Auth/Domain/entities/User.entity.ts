import { Entity, Identifier } from "@/domain-driven-design";
import { UserAvatarUrl } from "../value-objects/UserAvatarUrl.vo";

interface UserProps {
  discordId: string;
  username: string;
  avatar: string | null;
}

export class User extends Entity<UserProps> {
  private constructor(props: UserProps, id: string) {
    super(props, new Identifier(id));
  }

  static create(props: UserProps, id: string): User {
    return new User(props, id);
  }

  get id(): string {
    return this._id.toValue() as string;
  }

  get discordId(): string {
    return this.props.discordId;
  }

  get username(): string {
    return this.props.username;
  }

  get avatar(): string | null {
    return this.props.avatar;
  }

  get avatarUrl(): string {
    return UserAvatarUrl.fromUser(this.props.discordId, this.props.avatar).url;
  }
}

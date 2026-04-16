package shared

import "fmt"

const (
	InteractionTypePing           = 1
	InteractionTypeApplicationCmd = 2
)

const (
	ResponseTypePong     = 1
	ResponseTypeMessage  = 4
	ResponseTypeDeferred = 5
)

type Interaction struct {
	Type    int              `json:"type"`
	Data    *InteractionData `json:"data,omitempty"`
	Member  *Member          `json:"member,omitempty"`
	GuildID string           `json:"guild_id,omitempty"`
	Token   string           `json:"token,omitempty"`
}

type InteractionData struct {
	Name    string              `json:"name"`
	Options []InteractionOption `json:"options,omitempty"`
}

type InteractionOption struct {
	Name    string              `json:"name"`
	Value   interface{}         `json:"value,omitempty"`
	Options []InteractionOption `json:"options,omitempty"`
}

type Member struct {
	User        *User  `json:"user,omitempty"`
	Permissions string `json:"permissions,omitempty"`
}

type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
}

type InteractionResponse struct {
	Type int                      `json:"type"`
	Data *InteractionResponseData `json:"data,omitempty"`
}

type InteractionResponseData struct {
	Content string `json:"content"`
	Flags   int    `json:"flags,omitempty"`
}

func IsAdmin(permissions string) bool {
	var perms int64
	if _, err := fmt.Sscanf(permissions, "%d", &perms); err != nil {
		return false
	}
	return perms&0x8 != 0
}
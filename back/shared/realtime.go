package shared

import (
	"fmt"
	"strconv"
	"strings"
)

const (
	DefaultCanvasVersion = 1
	PublicConnectionsPK  = "ROOM#public"
)

type Pixel struct {
	X         int    `json:"x"`
	Y         int    `json:"y"`
	Color     string `json:"color"`
	UserID    string `json:"userId"`
	Username  string `json:"username"`
	UpdatedAt string `json:"updatedAt"`
}

type PixelRealtimePayload struct {
	SessionID     string `json:"sessionId"`
	CanvasVersion int    `json:"canvasVersion"`
	Pixel         Pixel  `json:"pixel"`
}

type CanvasResetPayload struct {
	SessionID     string `json:"sessionId"`
	CanvasVersion int    `json:"canvasVersion"`
	ResetAt       string `json:"resetAt"`
}

type PixelUpdatedEvent struct {
	Type    string               `json:"type"`
	Payload PixelRealtimePayload `json:"payload"`
}

type CanvasResetEvent struct {
	Type    string             `json:"type"`
	Payload CanvasResetPayload `json:"payload"`
}

type SessionStatePayload struct {
	SessionID     string `json:"sessionId"`
	CanvasVersion int    `json:"canvasVersion"`
	Status        string `json:"status"`
	ChangedAt     string `json:"changedAt"`
}

type SessionStateEvent struct {
	Type    string              `json:"type"`
	Payload SessionStatePayload `json:"payload"`
}

func ParseSessionIDFromPK(pk string) (string, error) {
	sessionID, found := strings.CutPrefix(pk, "SESSION#")
	if !found || sessionID == "" {
		return "", fmt.Errorf("invalid session PK: %s", pk)
	}

	return sessionID, nil
}

func ParsePixelCoordinates(sk string) (int, int, error) {
	parts := strings.Split(sk, "#")
	if len(parts) != 3 || parts[0] != "PIXEL" {
		return 0, 0, fmt.Errorf("invalid pixel SK: %s", sk)
	}

	x, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, fmt.Errorf("invalid pixel x coordinate: %w", err)
	}

	y, err := strconv.Atoi(parts[2])
	if err != nil {
		return 0, 0, fmt.Errorf("invalid pixel y coordinate: %w", err)
	}

	return x, y, nil
}

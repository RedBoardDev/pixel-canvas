package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type CommandChoice struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type CommandOption struct {
	Type        int             `json:"type"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Required    bool            `json:"required"`
	Choices     []CommandChoice `json:"choices,omitempty"`
	Options     []CommandOption `json:"options,omitempty"`
}

type Command struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Options     []CommandOption `json:"options,omitempty"`
}

const (
	OptionTypeSubCommand = 1
	OptionTypeString     = 3
	OptionTypeInteger    = 4
)

func main() {
	appID := os.Getenv("DISCORD_APP_ID")
	botToken := os.Getenv("DISCORD_BOT_TOKEN")

	if appID == "" || botToken == "" {
		fmt.Println("Erreur : DISCORD_APP_ID et DISCORD_BOT_TOKEN doivent être définis")
		os.Exit(1)
	}

	commands := []Command{
		{
			Name:        "draw",
			Description: "Draw a pixel on the canvas",
			Options: []CommandOption{
				{Type: OptionTypeInteger, Name: "x", Description: "X coordinate", Required: true},
				{Type: OptionTypeInteger, Name: "y", Description: "Y coordinate", Required: true},
				{
					Type:        OptionTypeString,
					Name:        "color",
					Description: "Choose a color",
					Required:    true,
					Choices: []CommandChoice{
						{Name: "Red-Orange", Value: "#FF4500"},
						{Name: "Orange", Value: "#FFA800"},
						{Name: "Yellow", Value: "#FFD635"},
						{Name: "Green", Value: "#00A368"},
						{Name: "Light Green", Value: "#7EED56"},
						{Name: "Dark Blue", Value: "#2450A4"},
						{Name: "Blue", Value: "#3690EA"},
						{Name: "Cyan", Value: "#51E9F4"},
						{Name: "Purple", Value: "#811E9F"},
						{Name: "Lavender", Value: "#B44AC0"},
						{Name: "Pink", Value: "#FF99AA"},
						{Name: "Brown", Value: "#9C6926"},
						{Name: "Black", Value: "#000000"},
						{Name: "Gray", Value: "#898D90"},
						{Name: "Light Gray", Value: "#D4D7D9"},
						{Name: "White", Value: "#FFFFFF"},
					},
				},
			},
		},
		{
			Name:        "canvas",
			Description: "Get the current canvas state (pixel count, session info)",
		},
		{
			Name:        "snapshot",
			Description: "[Admin] Generate and post a snapshot of the current canvas",
		},
		{
			Name:        "session",
			Description: "[Admin] Manage canvas sessions",
			Options: []CommandOption{
				{
					Type:        OptionTypeSubCommand,
					Name:        "start",
					Description: "Start a new session",
					Options: []CommandOption{
						{
							Type:        OptionTypeString,
							Name:        "width",
							Description: "Canvas width in pixels (e.g. 100) or 'infinite'.",
							Required:    false,
						},
						{
							Type:        OptionTypeString,
							Name:        "height",
							Description: "Canvas height in pixels (e.g. 100) or 'infinite'.",
							Required:    false,
						},
					},
				},
				{
					Type:        OptionTypeSubCommand,
					Name:        "pause",
					Description: "Pause the current session",
				},
				{
					Type:        OptionTypeSubCommand,
					Name:        "reset",
					Description: "Reset all pixels in the current session",
				},
			},
		},
	}

	body, _ := json.Marshal(commands)
	url := fmt.Sprintf("https://discord.com/api/v10/applications/%s/commands", appID)

	req, _ := http.NewRequest(http.MethodPut, url, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bot "+botToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("Erreur réseau :", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	fmt.Println("Résultat :", resp.Status)
}

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
	Options        []CommandOption  `json:"options,omitempty"`
}

type Command struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Options     []CommandOption `json:"options,omitempty"`
}


// Discord option types
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
						{Name: "Noir",   Value: "#000000"},
						{Name: "Blanc",  Value: "#FFFFFF"},
						{Name: "Rouge",  Value: "#FF0000"},
						{Name: "Vert",   Value: "#00FF00"},
						{Name: "Bleu",   Value: "#0000FF"},
						{Name: "Jaune",  Value: "#FFFF00"},
						{Name: "Magenta", Value: "#FF00FF"},
						{Name: "Cyan",   Value: "#00FFFF"},
						{Name: "Orange", Value: "#FFA500"},
						{Name: "Violet", Value: "#800080"},
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
							Name:        "size",
							Description: "Canvas size (ex: 100x100) or 'infinite'. Required for new sessions.",
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
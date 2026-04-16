package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"discord-bot/shared"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

var db *dynamodb.Client

func init() {
	cfg, _ := config.LoadDefaultConfig(context.Background())
	db = dynamodb.NewFromConfig(cfg)
}

type SessionItem struct {
	PK                 string `dynamodbav:"PK"`
	SK                 string `dynamodbav:"SK"`
	Status             string `dynamodbav:"status"`
	SessionID          string `dynamodbav:"session_id"`
	CreatedBy          string `dynamodbav:"created_by"`
	CreatedAt          string `dynamodbav:"created_at"`
	LastSnapshotURL    string `dynamodbav:"last_snapshot_url"`
	LastSnapshotAt     string `dynamodbav:"last_snapshot_at"`
	LastSnapshotPixels int    `dynamodbav:"last_snapshot_pixels"`
	LastSnapshotLarge  bool   `dynamodbav:"last_snapshot_large"`
}

func handler(ctx context.Context, outerRequest events.APIGatewayProxyRequest) error {
	var interaction shared.Interaction
	if err := json.Unmarshal([]byte(outerRequest.Body), &interaction); err != nil {
		return fmt.Errorf("failed to parse interaction: %w", err)
	}

	token := interaction.Token
	appID := os.Getenv("DISCORD_APP_ID")
	webhookURL := fmt.Sprintf(
		"https://discord.com/api/v10/webhooks/%s/%s/messages/@original",
		appID, token,
	)

	session, err := getActiveSession(ctx)
	if err != nil || session == nil {
		return patchDiscord(webhookURL, "No active session. An admin must start one with `/session start`.")
	}

	if session.LastSnapshotURL == "" {
		return patchDiscord(webhookURL, fmt.Sprintf(
			"**Canvas — Session `%s`**\nStatus: %s\n\nNo snapshot yet. An admin can take one with `/snapshot`.",
			session.SessionID, statusEmoji(session.Status),
		))
	}

	return postSnapshotEmbed(webhookURL, session)
}

func postSnapshotEmbed(webhookURL string, session *SessionItem) error {
	if session.LastSnapshotLarge {
		return patchDiscord(webhookURL, fmt.Sprintf(
			"**Canvas — Session `%s`**\n%d pixels au dernier snapshot — pris le `%s`\n\n[Canvas disponible ici](%s)\n\n*Lien valide 24h — utilisez `/snapshot` pour actualiser.*",
			session.SessionID, session.LastSnapshotPixels, session.LastSnapshotAt, session.LastSnapshotURL,
		))
	}

	embed := map[string]interface{}{
		"title":       fmt.Sprintf("Canvas — Session `%s`", session.SessionID),
		"description": fmt.Sprintf("**%d pixels** in the last snapshot\nTaken at `%s`\n\n*Use `/snapshot` to refresh.*", session.LastSnapshotPixels, session.LastSnapshotAt),
		"color":       0x5865F2,
		"image":       map[string]string{"url": session.LastSnapshotURL},
	}

	payload := map[string]interface{}{
		"content": "",
		"embeds":  []interface{}{embed},
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPatch, webhookURL, bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	return nil
}

func getActiveSession(ctx context.Context) (*SessionItem, error) {
	result, err := db.Scan(ctx, &dynamodb.ScanInput{
		TableName:        aws.String("sessions"),
		FilterExpression: aws.String("#s = :active AND SK = :meta"),
		ExpressionAttributeNames: map[string]string{
			"#s": "status",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":active": &types.AttributeValueMemberS{Value: "active"},
			":meta":   &types.AttributeValueMemberS{Value: "METADATA"},
		},
	})
	if err != nil || len(result.Items) == 0 {
		return nil, err
	}
	var session SessionItem
	if err := attributevalue.UnmarshalMap(result.Items[0], &session); err != nil {
		return nil, err
	}
	return &session, nil
}

func statusEmoji(status string) string {
	switch status {
	case "active":
		return "Active"
	case "paused":
		return "Paused"
	case "ended":
		return "Ended"
	default:
		return status
	}
}

func patchDiscord(webhookURL, content string) error {
	body, _ := json.Marshal(map[string]string{"content": content})
	req, err := http.NewRequest(http.MethodPatch, webhookURL, bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	return nil
}

func main() {
	lambda.Start(handler)
}
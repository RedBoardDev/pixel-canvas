package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"discord-bot/shared"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

const (
	maxPixelsPerMinute = 20
	tableName          = "canvas_pixels"
	rateLimitTable     = "rate_limits"
	sessionsTable      = "sessions"
)

var db *dynamodb.Client
var colorPalette = map[string]string{
	"#000000": "Black",
	"#FFFFFF": "White",
	"#FF0000": "Red",
	"#00FF00": "Green",
	"#0000FF": "Blue",
	"#FFFF00": "Yellow",
	"#FF00FF": "Magenta",
	"#00FFFF": "Cyan",
	"#FFA500": "Orange",
	"#800080": "Purple",
}

func init() {
	cfg, _ := config.LoadDefaultConfig(context.Background())
	db = dynamodb.NewFromConfig(cfg)
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

	if interaction.Member == nil || interaction.Member.User == nil {
		return patchDiscord(webhookURL, "Could not identify user.")
	}

	userID := interaction.Member.User.ID
	username := interaction.Member.User.Username

	opts := parseOptions(interaction.Data.Options)
	x, errX := strconv.Atoi(fmt.Sprintf("%v", opts["x"]))
	y, errY := strconv.Atoi(fmt.Sprintf("%v", opts["y"]))
	color := fmt.Sprintf("%v", opts["color"])
	colorName, allowed := colorPalette[color]

	if errX != nil || errY != nil {
		return patchDiscord(webhookURL, "Invalid coordinates.")
	}
	if !allowed {
		return patchDiscord(webhookURL, "Invalid color. Use `/draw` and select a color from the list.")
	}

	sessionID, err := getActiveSession(ctx)
	if err != nil || sessionID == "" {
		return patchDiscord(webhookURL, "No active session. An admin must start one with `/session start`.")
	}

	allowed, remaining, err := checkRateLimit(ctx, userID, sessionID)
	if err != nil {
		return patchDiscord(webhookURL, "Internal error checking rate limit.")
	}
	if !allowed {
		return patchDiscord(webhookURL, "Rate limit reached. You can draw up to 20 pixels per minute.")
	}

	now := time.Now().UTC().Format(time.RFC3339)
	_, err = db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(tableName),
		Item: map[string]types.AttributeValue{
			"PK":         &types.AttributeValueMemberS{Value: fmt.Sprintf("SESSION#%s", sessionID)},
			"SK":         &types.AttributeValueMemberS{Value: fmt.Sprintf("PIXEL#%d#%d", x, y)},
			"color":      &types.AttributeValueMemberS{Value: color},
			"user_id":    &types.AttributeValueMemberS{Value: userID},
			"username":   &types.AttributeValueMemberS{Value: username},
			"updated_at": &types.AttributeValueMemberS{Value: now},
		},
	})
	if err != nil {
		return patchDiscord(webhookURL, "Failed to save pixel.")
	}

	return patchDiscord(webhookURL,
		fmt.Sprintf("Pixel drawn at (%d, %d) in **%s** — %d/%d pixels remaining this minute.",
			x, y, colorName, maxPixelsPerMinute-remaining-1, maxPixelsPerMinute))
}

func getActiveSession(ctx context.Context) (string, error) {
	result, err := db.Scan(ctx, &dynamodb.ScanInput{
		TableName:        aws.String(sessionsTable),
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
		return "", err
	}
	var item map[string]string
	attributevalue.UnmarshalMap(result.Items[0], &item)
	return item["session_id"], nil
}

func checkRateLimit(ctx context.Context, userID, sessionID string) (allowed bool, count int, err error) {
	pk := fmt.Sprintf("USER#%s", userID)
	sk := fmt.Sprintf("SESSION#%s", sessionID)
	now := time.Now().UTC()
	windowStart := now.Truncate(time.Minute)
	ttl := windowStart.Add(time.Minute).Unix()

	result, err := db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(rateLimitTable),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: pk},
			"SK": &types.AttributeValueMemberS{Value: sk},
		},
	})
	if err != nil {
		return false, 0, err
	}

	currentCount := 0
	currentWindow := ""
	if result.Item != nil {
		if v, ok := result.Item["pixel_count"].(*types.AttributeValueMemberN); ok {
			currentCount, _ = strconv.Atoi(v.Value)
		}
		if v, ok := result.Item["window_start"].(*types.AttributeValueMemberS); ok {
			currentWindow = v.Value
		}
	}

	if currentWindow != windowStart.Format(time.RFC3339) {
		currentCount = 0
	}

	if currentCount >= maxPixelsPerMinute {
		return false, currentCount, nil
	}

	db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(rateLimitTable),
		Item: map[string]types.AttributeValue{
			"PK":           &types.AttributeValueMemberS{Value: pk},
			"SK":           &types.AttributeValueMemberS{Value: sk},
			"pixel_count":  &types.AttributeValueMemberN{Value: strconv.Itoa(currentCount + 1)},
			"window_start": &types.AttributeValueMemberS{Value: windowStart.Format(time.RFC3339)},
			"TTL":          &types.AttributeValueMemberN{Value: strconv.FormatInt(ttl, 10)},
		},
	})

	return true, currentCount, nil
}

func parseOptions(options []shared.InteractionOption) map[string]interface{} {
	result := make(map[string]interface{})
	for _, opt := range options {
		result[opt.Name] = opt.Value
	}
	return result
}

func patchDiscord(webhookURL, content string) error {
	body, _ := json.Marshal(map[string]string{"content": content})
	req, _ := http.NewRequest(http.MethodPatch, webhookURL, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	http.DefaultClient.Do(req)
	return nil
}

func main() {
	lambda.Start(handler)
}

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
	"#FF4500": "Red-Orange",
	"#FFA800": "Orange",
	"#FFD635": "Yellow",
	"#00A368": "Green",
	"#7EED56": "Light Green",
	"#2450A4": "Dark Blue",
	"#3690EA": "Blue",
	"#51E9F4": "Cyan",
	"#811E9F": "Purple",
	"#B44AC0": "Lavender",
	"#FF99AA": "Pink",
	"#9C6926": "Brown",
	"#000000": "Black",
	"#898D90": "Grey",
	"#D4D7D9": "Light Grey",
	"#FFFFFF": "White",
}

type SessionItem struct {
    PK           string `dynamodbav:"PK"`
    SK           string `dynamodbav:"SK"`
    Status       string `dynamodbav:"status"`
    SessionID    string `dynamodbav:"session_id"`
    CanvasSize   string `dynamodbav:"canvas_size"`
    CanvasWidth  int    `dynamodbav:"canvas_width"`
    CanvasHeight int    `dynamodbav:"canvas_height"`
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

	session, err := getActiveSession(ctx)
	if err != nil || session == nil {
		return patchDiscord(webhookURL, "No active session. An admin must start one with `/session start`.")
	}

	if session.CanvasWidth > 0 {
		if x < 0 || x >= session.CanvasWidth {
			return patchDiscord(webhookURL, fmt.Sprintf(
				"X coordinate (%d) is out of bounds. Width is limited to 0-%d.",
				x, session.CanvasWidth-1,
			))
		}
	}

	if session.CanvasHeight > 0 {
		if y < 0 || y >= session.CanvasHeight {
			return patchDiscord(webhookURL, fmt.Sprintf(
				"Y coordinate (%d) is out of bounds. Height is limited to 0-%d.",
				y, session.CanvasHeight-1,
			))
		}
	}

	allowed, remaining, err := checkRateLimit(ctx, userID, session.SessionID)
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
			"PK":         &types.AttributeValueMemberS{Value: fmt.Sprintf("SESSION#%s", session.SessionID)},
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

func getActiveSession(ctx context.Context) (*SessionItem, error) {
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
		return nil, err
	}
	var session SessionItem
	if err := attributevalue.UnmarshalMap(result.Items[0], &session); err != nil {
		return nil, err
	}
	return &session, nil
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

	if _, err := db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(rateLimitTable),
		Item: map[string]types.AttributeValue{
			"PK":           &types.AttributeValueMemberS{Value: pk},
			"SK":           &types.AttributeValueMemberS{Value: sk},
			"pixel_count":  &types.AttributeValueMemberN{Value: strconv.Itoa(currentCount + 1)},
			"window_start": &types.AttributeValueMemberS{Value: windowStart.Format(time.RFC3339)},
			"TTL":          &types.AttributeValueMemberN{Value: strconv.FormatInt(ttl, 10)},
		},
	}); err != nil {
		return false, 0, err
	}

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

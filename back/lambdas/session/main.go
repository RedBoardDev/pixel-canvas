package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
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
	UpdatedAt          string `dynamodbav:"updated_at"`
	CanvasSize         string `dynamodbav:"canvas_size"`
	CanvasWidth        int    `dynamodbav:"canvas_width"`
	CanvasHeight       int    `dynamodbav:"canvas_height"`
	LastSnapshotURL    string `dynamodbav:"last_snapshot_url"`
	LastSnapshotAt     string `dynamodbav:"last_snapshot_at"`
	LastSnapshotPixels int    `dynamodbav:"last_snapshot_pixels"`
}

type CanvasSize struct {
	Width          int
	Height         int
	Infinite       bool
	WidthInfinite  bool
	HeightInfinite bool
}

func parseCanvasSizeFromParts(widthRaw, heightRaw string) (*CanvasSize, string) {
	hasWidth := widthRaw != "" && widthRaw != "<nil>"
	hasHeight := heightRaw != "" && heightRaw != "<nil>"

	if !hasWidth && !hasHeight {
		return nil,
			"Please specify a canvas size to start a new session.\n" +
				"Examples:\n" +
				"• `/session start width:100 height:100` — canvas of 100×100 pixels\n" +
				"• `/session start width:infinite height:infinite` — fully unlimited canvas\n" +
				"• `/session start width:100 height:infinite` — 100 wide, unlimited height"
	}

	if hasWidth && !hasHeight {
		return nil, "You specified a width but no height. Please provide both `width` and `height`."
	}
	if !hasWidth && hasHeight {
		return nil, "You specified a height but no width. Please provide both `width` and `height`."
	}

	var w int
	widthInfinite := false
	wLower := strings.ToLower(strings.TrimSpace(widthRaw))
	if wLower == "infinite" || wLower == "inf" || wLower == "infini" {
		widthInfinite = true
	} else {
		var err error
		w, err = strconv.Atoi(widthRaw)
		if err != nil || w <= 0 {
			return nil, "Invalid width. Use a positive integer or `infinite`."
		}
	}

	// Parse height
	var h int
	heightInfinite := false
	hLower := strings.ToLower(strings.TrimSpace(heightRaw))
	if hLower == "infinite" || hLower == "inf" || hLower == "infini" {
		heightInfinite = true
	} else {
		var err error
		h, err = strconv.Atoi(heightRaw)
		if err != nil || h <= 0 {
			return nil, "Invalid height. Use a positive integer or `infinite`."
		}
	}

	if widthInfinite && heightInfinite {
		return &CanvasSize{Infinite: true}, ""
	}

	return &CanvasSize{
		Width:          w,
		Height:         h,
		WidthInfinite:  widthInfinite,
		HeightInfinite: heightInfinite,
	}, ""
}

func canvasSizeLabel(size *CanvasSize) string {
	if size.Infinite {
		return "Infinite"
	}
	wLabel := strconv.Itoa(size.Width)
	if size.WidthInfinite {
		wLabel = "∞"
	}
	hLabel := strconv.Itoa(size.Height)
	if size.HeightInfinite {
		hLabel = "∞"
	}
	return fmt.Sprintf("%sx%s", wLabel, hLabel)
}

func handler(ctx context.Context, outerRequest events.APIGatewayProxyRequest) error {
	var interaction shared.Interaction
	if err := json.Unmarshal([]byte(outerRequest.Body), &interaction); err != nil {
		return fmt.Errorf("failed to parse interaction: %w", err)
	}

	token := interaction.Token
	appID := os.Getenv("DISCORD_APP_ID")

	if token == "" || appID == "" {
		return fmt.Errorf("missing token or app ID")
	}

	webhookURL := fmt.Sprintf(
		"https://discord.com/api/v10/webhooks/%s/%s/messages/@original",
		appID, token,
	)

	if interaction.Member == nil || !shared.IsAdmin(interaction.Member.Permissions) {
		return patchDiscord(webhookURL, "You need administrator permissions to manage sessions.")
	}

	if len(interaction.Data.Options) == 0 {
		return patchDiscord(webhookURL, "Missing subcommand.")
	}

	subcommand := interaction.Data.Options[0].Name
	userID := interaction.Member.User.ID

	switch subcommand {
	case "start":
		widthRaw := ""
		heightRaw := ""
		for _, opt := range interaction.Data.Options[0].Options {
			switch opt.Name {
			case "width":
				widthRaw = fmt.Sprintf("%v", opt.Value)
			case "height":
				heightRaw = fmt.Sprintf("%v", opt.Value)
			}
		}
		return handleStart(ctx, webhookURL, userID, widthRaw, heightRaw)
	case "pause":
		return handlePause(ctx, webhookURL)
	case "reset":
		return handleReset(ctx, webhookURL)
	default:
		return patchDiscord(webhookURL, "Unknown subcommand.")
	}
}

func handleStart(ctx context.Context, webhookURL, userID, widthRaw, heightRaw string) error {
	active, _ := getSessionByStatus(ctx, "active")
	if active != nil {
		return patchDiscord(webhookURL, fmt.Sprintf(
			"A session is already active (`%s`).", active.SessionID,
		))
	}

	paused, _ := getSessionByStatus(ctx, "paused")
	if paused != nil {
		if widthRaw == "" && heightRaw == "" {
			if err := updateSessionStatus(ctx, paused.SessionID, "active"); err != nil {
				return patchDiscord(webhookURL, "Failed to resume session.")
			}
			sizeInfo := paused.CanvasSize
			if sizeInfo == "" {
				sizeInfo = "Infinite"
			}
			return patchDiscord(webhookURL, fmt.Sprintf(
				"Session `%s` resumed! Canvas size: **%s**.",
				paused.SessionID, sizeInfo,
			))
		}

		size, errMsg := parseCanvasSizeFromParts(widthRaw, heightRaw)
		if errMsg != "" {
			return patchDiscord(webhookURL, errMsg)
		}
		sizeLabel := canvasSizeLabel(size)
		updateExpr := "SET #s = :active, updated_at = :now, canvas_size = :cs"
		exprValues := map[string]types.AttributeValue{
			":active": &types.AttributeValueMemberS{Value: "active"},
			":now":    &types.AttributeValueMemberS{Value: time.Now().UTC().Format(time.RFC3339)},
			":cs":     &types.AttributeValueMemberS{Value: sizeLabel},
		}
		switch {
		case size.Infinite:
			updateExpr += " REMOVE canvas_width, canvas_height"
		case size.WidthInfinite:
			updateExpr += ", canvas_height = :ch REMOVE canvas_width"
			exprValues[":ch"] = &types.AttributeValueMemberN{Value: strconv.Itoa(size.Height)}
		case size.HeightInfinite:
			updateExpr += ", canvas_width = :cw REMOVE canvas_height"
			exprValues[":cw"] = &types.AttributeValueMemberN{Value: strconv.Itoa(size.Width)}
		default:
			updateExpr += ", canvas_width = :cw, canvas_height = :ch"
			exprValues[":cw"] = &types.AttributeValueMemberN{Value: strconv.Itoa(size.Width)}
			exprValues[":ch"] = &types.AttributeValueMemberN{Value: strconv.Itoa(size.Height)}
		}
		_, err := db.UpdateItem(ctx, &dynamodb.UpdateItemInput{
			TableName: aws.String("sessions"),
			Key: map[string]types.AttributeValue{
				"PK": &types.AttributeValueMemberS{Value: fmt.Sprintf("SESSION#%s", paused.SessionID)},
				"SK": &types.AttributeValueMemberS{Value: "METADATA"},
			},
			UpdateExpression: aws.String(updateExpr),
			ExpressionAttributeNames: map[string]string{"#s": "status"},
			ExpressionAttributeValues: exprValues,
		})
		if err != nil {
			return patchDiscord(webhookURL, "Failed to resume session with new size.")
		}
		return patchDiscord(webhookURL, fmt.Sprintf(
			"Session `%s` resumed with new canvas size: **%s**!",
			paused.SessionID, sizeLabel,
		))
	}

	size, errMsg := parseCanvasSizeFromParts(widthRaw, heightRaw)
	if errMsg != "" {
		return patchDiscord(webhookURL, errMsg)
	}

	sessionID := fmt.Sprintf("session-%d", time.Now().UnixMilli())
	now := time.Now().UTC().Format(time.RFC3339)
	sizeLabel := canvasSizeLabel(size)

	item := map[string]types.AttributeValue{
		"PK":          &types.AttributeValueMemberS{Value: fmt.Sprintf("SESSION#%s", sessionID)},
		"SK":          &types.AttributeValueMemberS{Value: "METADATA"},
		"session_id":  &types.AttributeValueMemberS{Value: sessionID},
		"status":      &types.AttributeValueMemberS{Value: "active"},
		"created_by":  &types.AttributeValueMemberS{Value: userID},
		"created_at":  &types.AttributeValueMemberS{Value: now},
		"updated_at":  &types.AttributeValueMemberS{Value: now},
		"canvas_size": &types.AttributeValueMemberS{Value: sizeLabel},
	}

	switch {
	case size.Infinite:
		// no canvas size attributes
	case size.WidthInfinite:
		item["canvas_height"] = &types.AttributeValueMemberN{Value: strconv.Itoa(size.Height)}
	case size.HeightInfinite:
		item["canvas_width"] = &types.AttributeValueMemberN{Value: strconv.Itoa(size.Width)}
	default:
		item["canvas_width"] = &types.AttributeValueMemberN{Value: strconv.Itoa(size.Width)}
		item["canvas_height"] = &types.AttributeValueMemberN{Value: strconv.Itoa(size.Height)}
	}

	_, err := db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String("sessions"),
		Item:      item,
	})
	if err != nil {
		return patchDiscord(webhookURL, "Failed to create session.")
	}

	return patchDiscord(webhookURL, fmt.Sprintf(
		"Session `%s` started! Canvas size: **%s**. Users can now draw with `/draw`.",
		sessionID, sizeLabel,
	))
}

func handlePause(ctx context.Context, webhookURL string) error {
	session, err := getSessionByStatus(ctx, "active")
	if err != nil || session == nil {
		return patchDiscord(webhookURL, "No active session to pause.")
	}

	if err := updateSessionStatus(ctx, session.SessionID, "paused"); err != nil {
		return patchDiscord(webhookURL, "Failed to pause session.")
	}

	return patchDiscord(webhookURL, fmt.Sprintf(
		"Session `%s` paused. Resume it with `/session start`.", session.SessionID,
	))
}

func handleReset(ctx context.Context, webhookURL string) error {
	session, err := getSessionByStatus(ctx, "active")
	if err != nil || session == nil {
		session, err = getSessionByStatus(ctx, "paused")
		if err != nil || session == nil {
			return patchDiscord(webhookURL, "No active or paused session to reset.")
		}
	}

	deleted, err := deleteAllPixels(ctx, session.SessionID)
	if err != nil {
		return patchDiscord(webhookURL, fmt.Sprintf("Failed to reset canvas: %v", err))
	}

	return patchDiscord(webhookURL, fmt.Sprintf(
		"Canvas reset! %d pixels deleted from session `%s`.", deleted, session.SessionID,
	))
}

func getSessionByStatus(ctx context.Context, status string) (*SessionItem, error) {
	result, err := db.Scan(ctx, &dynamodb.ScanInput{
		TableName:        aws.String("sessions"),
		FilterExpression: aws.String("#s = :status AND SK = :meta"),
		ExpressionAttributeNames: map[string]string{
			"#s": "status",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":status": &types.AttributeValueMemberS{Value: status},
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

func updateSessionStatus(ctx context.Context, sessionID, status string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := db.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName: aws.String("sessions"),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: fmt.Sprintf("SESSION#%s", sessionID)},
			"SK": &types.AttributeValueMemberS{Value: "METADATA"},
		},
		UpdateExpression: aws.String("SET #s = :status, updated_at = :now"),
		ExpressionAttributeNames: map[string]string{
			"#s": "status",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":status": &types.AttributeValueMemberS{Value: status},
			":now":    &types.AttributeValueMemberS{Value: now},
		},
	})
	return err
}

func deleteAllPixels(ctx context.Context, sessionID string) (int, error) {
	deleted := 0
	var lastKey map[string]types.AttributeValue

	for {
		result, err := db.Query(ctx, &dynamodb.QueryInput{
			TableName:              aws.String("canvas_pixels"),
			KeyConditionExpression: aws.String("PK = :pk"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":pk": &types.AttributeValueMemberS{Value: fmt.Sprintf("SESSION#%s", sessionID)},
			},
			ProjectionExpression: aws.String("PK, SK"),
			ExclusiveStartKey:    lastKey,
		})
		if err != nil {
			return deleted, fmt.Errorf("query failed: %w", err)
		}

		if len(result.Items) == 0 {
			break
		}

		for i := 0; i < len(result.Items); i += 25 {
			end := i + 25
			if end > len(result.Items) {
				end = len(result.Items)
			}
			batch := result.Items[i:end]

			requests := make([]types.WriteRequest, len(batch))
			for j, item := range batch {
				requests[j] = types.WriteRequest{
					DeleteRequest: &types.DeleteRequest{
						Key: map[string]types.AttributeValue{
							"PK": item["PK"],
							"SK": item["SK"],
						},
					},
				}
			}

			_, err := db.BatchWriteItem(ctx, &dynamodb.BatchWriteItemInput{
				RequestItems: map[string][]types.WriteRequest{
					"canvas_pixels": requests,
				},
			})
			if err != nil {
				return deleted, fmt.Errorf("batch delete failed: %w", err)
			}
			deleted += len(batch)
		}

		if result.LastEvaluatedKey == nil {
			break
		}
		lastKey = result.LastEvaluatedKey
	}

	return deleted, nil
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
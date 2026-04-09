package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
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
	PK        string `dynamodbav:"PK"`
	SK        string `dynamodbav:"SK"`
	Status    string `dynamodbav:"status"`
	SessionID string `dynamodbav:"session_id"`
	CreatedBy string `dynamodbav:"created_by"`
	CreatedAt string `dynamodbav:"created_at"`
	UpdatedAt string `dynamodbav:"updated_at"`
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
		return handleStart(ctx, webhookURL, userID)
	case "pause":
		return handlePause(ctx, webhookURL)
	case "reset":
		return handleReset(ctx, webhookURL)
	default:
		return patchDiscord(webhookURL, "Unknown subcommand.")
	}
}

func handleStart(ctx context.Context, webhookURL, userID string) error {
	active, _ := getSessionByStatus(ctx, "active")
	if active != nil {
		return patchDiscord(webhookURL, fmt.Sprintf(
			"A session is already active (`%s`).", active.SessionID,
		))
	}

	paused, _ := getSessionByStatus(ctx, "paused")
	if paused != nil {
		if err := updateSessionStatus(ctx, paused.SessionID, "active"); err != nil {
			return patchDiscord(webhookURL, "Failed to resume session.")
		}
		return patchDiscord(webhookURL, fmt.Sprintf(
			"Session `%s` resumed! Users can draw again with `/draw`.", paused.SessionID,
		))
	}

	sessionID := fmt.Sprintf("session-%d", time.Now().UnixMilli())
	now := time.Now().UTC().Format(time.RFC3339)

	_, err := db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String("sessions"),
		Item: map[string]types.AttributeValue{
			"PK":         &types.AttributeValueMemberS{Value: fmt.Sprintf("SESSION#%s", sessionID)},
			"SK":         &types.AttributeValueMemberS{Value: "METADATA"},
			"session_id": &types.AttributeValueMemberS{Value: sessionID},
			"status":     &types.AttributeValueMemberS{Value: "active"},
			"created_by": &types.AttributeValueMemberS{Value: userID},
			"created_at": &types.AttributeValueMemberS{Value: now},
			"updated_at": &types.AttributeValueMemberS{Value: now},
		},
	})
	if err != nil {
		return patchDiscord(webhookURL, "Failed to create session.")
	}

	return patchDiscord(webhookURL, fmt.Sprintf(
		"Session `%s` started! Users can now draw with `/draw`.", sessionID,
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
		return patchDiscord(webhookURL, "No active session to reset.")
	}

	deleted, err := deleteAllPixels(ctx, session.SessionID)
	if err != nil {
		return patchDiscord(webhookURL, "Failed to reset canvas.")
	}

	return patchDiscord(webhookURL, fmt.Sprintf(
		"Canvas reset! %d pixels deleted from session `%s`.", deleted, session.SessionID,
	))
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
	attributevalue.UnmarshalMap(result.Items[0], &session)
	return &session, nil
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
	attributevalue.UnmarshalMap(result.Items[0], &session)
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
	req, _ := http.NewRequest(http.MethodPatch, webhookURL, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	http.DefaultClient.Do(req)
	return nil
}

func main() {
	lambda.Start(handler)
}

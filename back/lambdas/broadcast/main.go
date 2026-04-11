package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"discord-bot/shared"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/apigatewaymanagementapi"
	apigwtypes "github.com/aws/aws-sdk-go-v2/service/apigatewaymanagementapi/types"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type ConnectionItem struct {
	ConnectionID string
	DomainName   string
	Stage        string
}

var (
	db        *dynamodb.Client
	awsConfig aws.Config
)

func init() {
	cfg, _ := config.LoadDefaultConfig(context.Background())
	awsConfig = cfg
	db = dynamodb.NewFromConfig(cfg)
}

func handler(ctx context.Context, dynamoEvent events.DynamoDBEvent) error {
	messages := make([][]byte, 0, len(dynamoEvent.Records))
	for _, record := range dynamoEvent.Records {
		msgs, err := buildRealtimeMessage(record)
		if err != nil {
			log.Printf("broadcast: failed to build message for record %s: %v", record.EventID, err)
			continue
		}
		messages = append(messages, msgs...)
	}

	if len(messages) == 0 {
		return nil
	}

	connections, err := listConnections(ctx)
	if err != nil {
		return err
	}

	if len(connections) == 0 {
		return nil
	}

	clients := make(map[string]*apigatewaymanagementapi.Client)
	staleConnections := make(map[string]ConnectionItem)

	for _, message := range messages {
		for _, connection := range connections {
			if _, marked := staleConnections[connection.ConnectionID]; marked {
				continue
			}

			if err := postMessage(ctx, clients, connection, message); err != nil {
				if isGoneError(err) {
					staleConnections[connection.ConnectionID] = connection
					continue
				}

				log.Printf("broadcast: failed to send message to connection %s: %v", connection.ConnectionID, err)
			}
		}
	}

	for _, connection := range staleConnections {
		if err := deleteConnection(ctx, connection.ConnectionID); err != nil {
			log.Printf("broadcast: failed to delete stale connection %s: %v", connection.ConnectionID, err)
		}
	}

	return nil
}

func buildRealtimeMessage(record events.DynamoDBEventRecord) ([][]byte, error) {
	keys := record.Change.Keys
	sk := stringAttribute(keys, "SK")

	switch {
	case strings.HasPrefix(sk, "PIXEL#"):
		msg, ok, err := buildPixelUpdatedMessage(record)
		if err != nil || !ok {
			return nil, err
		}
		return [][]byte{msg}, nil
	case sk == "METADATA":
		return buildSessionMetadataMessages(record)
	default:
		return nil, nil
	}
}

func buildPixelUpdatedMessage(record events.DynamoDBEventRecord) ([]byte, bool, error) {
	if record.EventName != "INSERT" && record.EventName != "MODIFY" {
		return nil, false, nil
	}

	newImage := record.Change.NewImage
	if len(newImage) == 0 {
		return nil, false, nil
	}

	sessionID, err := shared.ParseSessionIDFromPK(stringAttribute(newImage, "PK"))
	if err != nil {
		return nil, false, err
	}

	x, y, err := shared.ParsePixelCoordinates(stringAttribute(newImage, "SK"))
	if err != nil {
		return nil, false, err
	}

	payload := shared.PixelUpdatedEvent{
		Type: "pixel.updated",
		Payload: shared.PixelRealtimePayload{
			SessionID:     sessionID,
			CanvasVersion: numberAttribute(newImage, "canvas_version", shared.DefaultCanvasVersion),
			Pixel: shared.Pixel{
				X:         x,
				Y:         y,
				Color:     stringAttribute(newImage, "color"),
				UserID:    stringAttribute(newImage, "user_id"),
				Username:  stringAttribute(newImage, "username"),
				UpdatedAt: stringAttribute(newImage, "updated_at"),
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, false, err
	}

	return body, true, nil
}

func buildSessionMetadataMessages(record events.DynamoDBEventRecord) ([][]byte, error) {
	newImage := record.Change.NewImage
	if len(newImage) == 0 {
		return nil, nil
	}

	sessionID := stringAttribute(newImage, "session_id")
	if sessionID == "" {
		var err error
		sessionID, err = shared.ParseSessionIDFromPK(stringAttribute(newImage, "PK"))
		if err != nil {
			return nil, err
		}
	}

	newStatus := stringAttribute(newImage, "status")
	canvasVersion := numberAttribute(newImage, "canvas_version", shared.DefaultCanvasVersion)

	switch record.EventName {
	case "INSERT":
		if newStatus == "active" {
			return buildSessionStateChanged(sessionID, canvasVersion, newStatus, newImage)
		}
		return nil, nil

	case "MODIFY":
		oldImage := record.Change.OldImage
		oldCanvasVersion := numberAttribute(oldImage, "canvas_version", shared.DefaultCanvasVersion)

		if canvasVersion > oldCanvasVersion {
			return buildCanvasReset(sessionID, canvasVersion, newImage)
		}

		oldStatus := stringAttribute(oldImage, "status")
		if newStatus != oldStatus {
			return buildSessionStateChanged(sessionID, canvasVersion, newStatus, newImage)
		}

		return nil, nil

	default:
		return nil, nil
	}
}

func buildCanvasReset(sessionID string, canvasVersion int, newImage map[string]events.DynamoDBAttributeValue) ([][]byte, error) {
	resetAt := stringAttribute(newImage, "last_reset_at")
	if resetAt == "" {
		resetAt = stringAttribute(newImage, "created_at")
	}
	if resetAt == "" {
		resetAt = stringAttribute(newImage, "updated_at")
	}

	payload := shared.CanvasResetEvent{
		Type: "canvas.reset",
		Payload: shared.CanvasResetPayload{
			SessionID:     sessionID,
			CanvasVersion: canvasVersion,
			ResetAt:       resetAt,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	return [][]byte{body}, nil
}

func buildSessionStateChanged(sessionID string, canvasVersion int, status string, newImage map[string]events.DynamoDBAttributeValue) ([][]byte, error) {
	changedAt := stringAttribute(newImage, "updated_at")

	payload := shared.SessionStateEvent{
		Type: "session.state_changed",
		Payload: shared.SessionStatePayload{
			SessionID:     sessionID,
			CanvasVersion: canvasVersion,
			Status:        status,
			ChangedAt:     changedAt,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	return [][]byte{body}, nil
}

func listConnections(ctx context.Context) ([]ConnectionItem, error) {
	result, err := db.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(connectionsTableName()),
		KeyConditionExpression: aws.String("PK = :pk"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk": &types.AttributeValueMemberS{Value: shared.PublicConnectionsPK},
		},
	})
	if err != nil {
		return nil, err
	}

	connections := make([]ConnectionItem, 0, len(result.Items))
	for _, item := range result.Items {
		connectionID := dynamoString(item["connection_id"])
		if connectionID == "" {
			connectionID = strings.TrimPrefix(dynamoString(item["SK"]), "CONNECTION#")
		}

		if connectionID == "" {
			continue
		}

		connections = append(connections, ConnectionItem{
			ConnectionID: connectionID,
			DomainName:   dynamoString(item["domain_name"]),
			Stage:        dynamoString(item["stage"]),
		})
	}

	return connections, nil
}

func postMessage(
	ctx context.Context,
	clients map[string]*apigatewaymanagementapi.Client,
	connection ConnectionItem,
	message []byte,
) error {
	if connection.DomainName == "" || connection.Stage == "" {
		return fmt.Errorf("missing connection endpoint metadata for %s", connection.ConnectionID)
	}

	endpoint := fmt.Sprintf("https://%s/%s", connection.DomainName, connection.Stage)
	client, ok := clients[endpoint]
	if !ok {
		client = apigatewaymanagementapi.NewFromConfig(awsConfig, func(options *apigatewaymanagementapi.Options) {
			options.BaseEndpoint = aws.String(endpoint)
		})
		clients[endpoint] = client
	}

	_, err := client.PostToConnection(ctx, &apigatewaymanagementapi.PostToConnectionInput{
		ConnectionId: aws.String(connection.ConnectionID),
		Data:         message,
	})
	return err
}

func deleteConnection(ctx context.Context, connectionID string) error {
	_, err := db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(connectionsTableName()),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: shared.PublicConnectionsPK},
			"SK": &types.AttributeValueMemberS{Value: connectionSortKey(connectionID)},
		},
	})
	return err
}

func isGoneError(err error) bool {
	var goneException *apigwtypes.GoneException
	if errors.As(err, &goneException) {
		return true
	}

	return strings.Contains(err.Error(), "410")
}

func connectionsTableName() string {
	if tableName := os.Getenv("WS_CONNECTIONS_TABLE"); tableName != "" {
		return tableName
	}

	return "ws_connections"
}

func connectionSortKey(connectionID string) string {
	return fmt.Sprintf("CONNECTION#%s", connectionID)
}

func stringAttribute(attributes map[string]events.DynamoDBAttributeValue, key string) string {
	attribute, ok := attributes[key]
	if !ok {
		return ""
	}

	return attribute.String()
}

func numberAttribute(attributes map[string]events.DynamoDBAttributeValue, key string, fallback int) int {
	attribute, ok := attributes[key]
	if !ok {
		return fallback
	}

	value, err := strconv.Atoi(attribute.Number())
	if err != nil || value <= 0 {
		return fallback
	}

	return value
}

func dynamoString(attribute types.AttributeValue) string {
	if attribute == nil {
		return ""
	}

	stringAttribute, ok := attribute.(*types.AttributeValueMemberS)
	if !ok {
		return ""
	}

	return stringAttribute.Value
}

func main() {
	lambda.Start(handler)
}

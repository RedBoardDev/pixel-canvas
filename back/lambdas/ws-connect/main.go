package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"discord-bot/shared"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

var db *dynamodb.Client

func init() {
	cfg, _ := config.LoadDefaultConfig(context.Background())
	db = dynamodb.NewFromConfig(cfg)
}

func handler(ctx context.Context, request events.APIGatewayWebsocketProxyRequest) (events.APIGatewayProxyResponse, error) {
	connectionID := request.RequestContext.ConnectionID
	if connectionID == "" {
		return events.APIGatewayProxyResponse{StatusCode: 400}, nil
	}

	_, err := db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(connectionsTableName()),
		Item: map[string]types.AttributeValue{
			"PK":            &types.AttributeValueMemberS{Value: shared.PublicConnectionsPK},
			"SK":            &types.AttributeValueMemberS{Value: connectionSortKey(connectionID)},
			"connection_id": &types.AttributeValueMemberS{Value: connectionID},
			"domain_name":   &types.AttributeValueMemberS{Value: request.RequestContext.DomainName},
			"stage":         &types.AttributeValueMemberS{Value: request.RequestContext.Stage},
			"connected_at":  &types.AttributeValueMemberS{Value: time.Now().UTC().Format(time.RFC3339)},
		},
	})
	if err != nil {
		return events.APIGatewayProxyResponse{StatusCode: 500}, err
	}

	return events.APIGatewayProxyResponse{StatusCode: 200}, nil
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

func main() {
	lambda.Start(handler)
}

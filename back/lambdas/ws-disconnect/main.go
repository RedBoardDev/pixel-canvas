package main

import (
	"context"
	"fmt"
	"os"

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

	_, err := db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(connectionsTableName()),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: shared.PublicConnectionsPK},
			"SK": &types.AttributeValueMemberS{Value: connectionSortKey(connectionID)},
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

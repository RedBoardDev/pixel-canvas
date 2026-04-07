package main

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"os"
	"log"
	"discord-bot/shared"

	golambda "github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/config"
	awslambda "github.com/aws/aws-sdk-go-v2/service/lambda"
	"github.com/aws/aws-sdk-go-v2/service/lambda/types"
)

var (
	publicKey    ed25519.PublicKey
	lambdaClient *awslambda.Client
)

func init() {
	keyHex := os.Getenv("DISCORD_PUBLIC_KEY")
	keyBytes, _ := hex.DecodeString(keyHex)
	publicKey = ed25519.PublicKey(keyBytes)

	cfg, _ := config.LoadDefaultConfig(context.Background())
	lambdaClient = awslambda.NewFromConfig(cfg)
}

func verifyRequest(signature, timestamp, body string) bool {
	sigBytes, err := hex.DecodeString(signature)
	if err != nil {
		return false
	}
	return ed25519.Verify(publicKey, []byte(timestamp+body), sigBytes)
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	sig := request.Headers["x-signature-ed25519"]
	ts := request.Headers["x-signature-timestamp"]

	if !verifyRequest(sig, ts, request.Body) {
		return events.APIGatewayProxyResponse{
			StatusCode: 401,
			Body:       `{"error":"Invalid request signature"}`,
		}, nil
	}

	var interaction shared.Interaction
	if err := json.Unmarshal([]byte(request.Body), &interaction); err != nil {
		return events.APIGatewayProxyResponse{StatusCode: 400}, nil
	}

	if interaction.Type == shared.InteractionTypePing {
		return shared.Respond(shared.InteractionResponse{Type: shared.ResponseTypePong})
	}

	if interaction.Type == shared.InteractionTypeApplicationCmd && interaction.Data != nil {
		targetLambda := map[string]string{
			"draw":     os.Getenv("LAMBDA_DRAW"),
			"canvas":   os.Getenv("LAMBDA_CANVAS"),
			"snapshot": os.Getenv("LAMBDA_SNAPSHOT"),
			"session":  os.Getenv("LAMBDA_SESSION"),
		}[interaction.Data.Name]

		if targetLambda == "" {
			log.Printf("ERROR: no target lambda for command: %s", interaction.Data.Name)
			return shared.RespondText("Unknown command.")
		}

		payload, _ := json.Marshal(request)
		log.Printf("INFO: invoking lambda %s for command %s", targetLambda, interaction.Data.Name)

		result, err := lambdaClient.Invoke(ctx, &awslambda.InvokeInput{
			FunctionName:   &targetLambda,
			InvocationType: types.InvocationTypeEvent,
			Payload:        payload,
		})
		if err != nil {
			log.Printf("ERROR: failed to invoke lambda %s: %v", targetLambda, err)
			return shared.RespondText("❌ Internal error invoking command handler.")
		}
		log.Printf("INFO: invoke result status: %d", result.StatusCode)

		return shared.Respond(shared.InteractionResponse{
			Type: shared.ResponseTypeDeferred,
		})
	}

	return events.APIGatewayProxyResponse{StatusCode: 400}, nil
}

func main() {
	golambda.Start(handler)
}
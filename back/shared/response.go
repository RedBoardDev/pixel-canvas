package shared

import (
	"encoding/json"
	"github.com/aws/aws-lambda-go/events"
)

func Respond(r InteractionResponse) (events.APIGatewayProxyResponse, error) {
	b, err := json.Marshal(r)
	if err != nil {
		return events.APIGatewayProxyResponse{StatusCode: 500}, err
	}
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    map[string]string{"Content-Type": "application/json"},
		Body:       string(b),
	}, nil
}

func RespondText(content string) (events.APIGatewayProxyResponse, error) {
	return Respond(InteractionResponse{
		Type: ResponseTypeMessage,
		Data: &InteractionResponseData{Content: content},
	})
}

func RespondEphemeral(content string) (events.APIGatewayProxyResponse, error) {
	return Respond(InteractionResponse{
		Type: ResponseTypeMessage,
		Data: &InteractionResponseData{
			Content: content,
			Flags:   64,
		},
	})
}
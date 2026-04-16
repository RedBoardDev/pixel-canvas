package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
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
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

const (
	pixelSize    = 1
	maxImageSize = 800
	bgColor      = "#FFFFFF"
)

var (
	db       *dynamodb.Client
	s3Client *s3.Client
)

func init() {
	cfg, _ := config.LoadDefaultConfig(context.Background())
	db = dynamodb.NewFromConfig(cfg)
	s3Client = s3.NewFromConfig(cfg)
}

type PixelItem struct {
	PK        string `dynamodbav:"PK"`
	SK        string `dynamodbav:"SK"`
	Color     string `dynamodbav:"color"`
	UserID    string `dynamodbav:"user_id"`
	Username  string `dynamodbav:"username"`
	UpdatedAt string `dynamodbav:"updated_at"`
}

type SessionItem struct {
	PK           string `dynamodbav:"PK"`
	SK           string `dynamodbav:"SK"`
	Status       string `dynamodbav:"status"`
	SessionID    string `dynamodbav:"session_id"`
	CreatedBy    string `dynamodbav:"created_by"`
	CreatedAt    string `dynamodbav:"created_at"`
	CanvasSize   string `dynamodbav:"canvas_size"`
	CanvasWidth  int    `dynamodbav:"canvas_width"`
	CanvasHeight int    `dynamodbav:"canvas_height"`
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

	if interaction.Member == nil || !shared.IsAdmin(interaction.Member.Permissions) {
		return patchDiscord(webhookURL, "You need administrator permissions to take snapshots.")
	}

	session, err := getActiveSession(ctx)
	if err != nil || session == nil {
		return patchDiscord(webhookURL, "No active session found.")
	}

	pixels, err := getAllPixels(ctx, session.SessionID)
	if err != nil {
		return patchDiscord(webhookURL, "Failed to retrieve canvas pixels.")
	}
	if len(pixels) == 0 {
		return patchDiscord(webhookURL, "Canvas is empty — nothing to snapshot yet.")
	}

	minX, minY, maxX, maxY := getPixelBounds(pixels)
	canvasW := maxX - minX + 1
	canvasH := maxY - minY + 1

	var isLargeCanvas bool
	if session.CanvasWidth > 0 && session.CanvasHeight > 0 {
		isLargeCanvas = session.CanvasWidth > maxImageSize || session.CanvasHeight > maxImageSize
	} else {
		isLargeCanvas = canvasW > maxImageSize || canvasH > maxImageSize
	}

	imgBytes, width, height, err := renderCanvas(pixels)
	if err != nil {
		return patchDiscord(webhookURL, "Failed to render canvas image.")
	}

	s3Key := fmt.Sprintf("snapshots/%s/%d.png", session.SessionID, time.Now().UnixMilli())
	bucket := os.Getenv("S3_BUCKET")
	_, err = s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(s3Key),
		Body:        bytes.NewReader(imgBytes),
		ContentType: aws.String("image/png"),
	})
	if err != nil {
		return patchDiscord(webhookURL, "Failed to upload snapshot to S3.")
	}

	presigner := s3.NewPresignClient(s3Client)
	presigned, err := presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(s3Key),
	}, s3.WithPresignExpires(24*time.Hour))
	if err != nil {
		return patchDiscord(webhookURL, "Failed to generate snapshot URL.")
	}

	_, err = db.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName: aws.String("sessions"),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: fmt.Sprintf("SESSION#%s", session.SessionID)},
			"SK": &types.AttributeValueMemberS{Value: "METADATA"},
		},
		UpdateExpression: aws.String("SET last_snapshot_url = :url, last_snapshot_at = :at, last_snapshot_pixels = :px, last_snapshot_large = :large"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":url":   &types.AttributeValueMemberS{Value: presigned.URL},
			":at":    &types.AttributeValueMemberS{Value: time.Now().UTC().Format(time.RFC3339)},
			":px":    &types.AttributeValueMemberN{Value: strconv.Itoa(len(pixels))},
			":large": &types.AttributeValueMemberBOOL{Value: isLargeCanvas},
		},
	})
	if err != nil {
		return patchDiscord(webhookURL, "Failed to save snapshot metadata.")
	}

	if isLargeCanvas {
		return patchDiscord(webhookURL, fmt.Sprintf(
			"**Snapshot — Session `%s`**\n%d pixels | Canvas %dx%d\n\n[Canvas disponible ici](%s)\n\n*Lien valide 24h*",
			session.SessionID, len(pixels), canvasW, canvasH, presigned.URL,
		))
	}

	err = postSnapshotToDiscord(webhookURL, imgBytes, session.SessionID, len(pixels), width, height)
	if err != nil {
		return patchDiscord(webhookURL, fmt.Sprintf(
			"Snapshot — Session `%s`\n%d pixels | %dx%d\n%s",
			session.SessionID, len(pixels), width, height, presigned.URL,
		))
	}

	return nil
}

func renderCanvas(pixels []PixelItem) ([]byte, int, int, error) {
	minX, minY, maxX, maxY := getPixelBounds(pixels)
	canvasW := maxX - minX + 1
	canvasH := maxY - minY + 1

	blockSize := pixelSize
	if canvasW*blockSize > maxImageSize || canvasH*blockSize > maxImageSize {
		scaleW := maxImageSize / canvasW
		scaleH := maxImageSize / canvasH
		blockSize = scaleW
		if scaleH < blockSize {
			blockSize = scaleH
		}
		if blockSize < 1 {
			blockSize = 1
		}
	}

	imgW := canvasW * blockSize
	imgH := canvasH * blockSize

	img := image.NewRGBA(image.Rect(0, 0, imgW, imgH))
	bg := hexToColor(bgColor)
	for y := 0; y < imgH; y++ {
		for x := 0; x < imgW; x++ {
			img.Set(x, y, bg)
		}
	}

	for _, p := range pixels {
		var px, py int
		if _, err := fmt.Sscanf(strings.TrimPrefix(p.SK, "PIXEL#"), "%d#%d", &px, &py); err != nil {
			continue
		}
		ix := (px - minX) * blockSize
		iy := (py - minY) * blockSize
		c := hexToColor(p.Color)
		for dy := 0; dy < blockSize; dy++ {
			for dx := 0; dx < blockSize; dx++ {
				img.Set(ix+dx, iy+dy, c)
			}
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, 0, 0, err
	}
	return buf.Bytes(), imgW, imgH, nil
}

func postSnapshotToDiscord(webhookURL string, imgBytes []byte, sessionID string, pixelCount, width, height int) error {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	jsonPayload := map[string]interface{}{
		"content": "",
		"embeds": []map[string]interface{}{
			{
				"title":       fmt.Sprintf("Canvas Snapshot — Session `%s`", sessionID),
				"description": fmt.Sprintf("**%d pixels** drawn | Rendered at %dx%d", pixelCount, width, height),
				"color":       0x5865F2,
				"image":       map[string]string{"url": "attachment://snapshot.png"},
				"timestamp":   time.Now().UTC().Format(time.RFC3339),
			},
		},
		"attachments": []map[string]interface{}{
			{"id": 0, "filename": "snapshot.png"},
		},
	}
	jsonBytes, _ := json.Marshal(jsonPayload)

	jsonHeader := make(textproto.MIMEHeader)
	jsonHeader.Set("Content-Disposition", `form-data; name="payload_json"`)
	jsonHeader.Set("Content-Type", "application/json")
	jsonPart, err := writer.CreatePart(jsonHeader)
	if err != nil {
		return err
	}
	if _, err := jsonPart.Write(jsonBytes); err != nil {
		return err
	}

	fileHeader := make(textproto.MIMEHeader)
	fileHeader.Set("Content-Disposition", `form-data; name="files[0]"; filename="snapshot.png"`)
	fileHeader.Set("Content-Type", "image/png")
	filePart, err := writer.CreatePart(fileHeader)
	if err != nil {
		return err
	}
	if _, err := filePart.Write(imgBytes); err != nil {
		return err
	}

	if err := writer.Close(); err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPatch, webhookURL, &body)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("discord error %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

func hexToColor(hex string) color.RGBA {
	hex = strings.TrimPrefix(hex, "#")
	if len(hex) != 6 {
		return color.RGBA{255, 255, 255, 255}
	}
	r, _ := strconv.ParseUint(hex[0:2], 16, 8)
	g, _ := strconv.ParseUint(hex[2:4], 16, 8)
	b, _ := strconv.ParseUint(hex[4:6], 16, 8)
	return color.RGBA{uint8(r), uint8(g), uint8(b), 255}
}

func getPixelBounds(pixels []PixelItem) (minX, minY, maxX, maxY int) {
	minX, minY = 1<<31-1, 1<<31-1
	maxX, maxY = -1<<31, -1<<31
	for _, p := range pixels {
		var x, y int
		if _, err := fmt.Sscanf(strings.TrimPrefix(p.SK, "PIXEL#"), "%d#%d", &x, &y); err != nil {
			continue
		}
		if x < minX { minX = x }
		if x > maxX { maxX = x }
		if y < minY { minY = y }
		if y > maxY { maxY = y }
	}
	return
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

func getAllPixels(ctx context.Context, sessionID string) ([]PixelItem, error) {
	var pixels []PixelItem
	var lastKey map[string]types.AttributeValue

	for {
		result, err := db.Query(ctx, &dynamodb.QueryInput{
			TableName:              aws.String("canvas_pixels"),
			KeyConditionExpression: aws.String("PK = :pk"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":pk": &types.AttributeValueMemberS{Value: fmt.Sprintf("SESSION#%s", sessionID)},
			},
			ExclusiveStartKey: lastKey,
		})
		if err != nil {
			return nil, err
		}

		var page []PixelItem
		if err := attributevalue.UnmarshalListOfMaps(result.Items, &page); err != nil {
			return nil, err
		}
		pixels = append(pixels, page...)

		if result.LastEvaluatedKey == nil {
			break
		}
		lastKey = result.LastEvaluatedKey
	}

	return pixels, nil
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
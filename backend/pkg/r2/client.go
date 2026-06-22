package r2

import (
	"context"
	"fmt"
	"io"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Client struct {
	s3        *s3.Client
	bucket    string
	publicURL string
}

var Default *Client

func Init() error {
	accountID := os.Getenv("R2_ACCOUNT_ID")
	accessKey := os.Getenv("R2_ACCESS_KEY")
	secretKey := os.Getenv("R2_SECRET_KEY")
	bucket    := os.Getenv("R2_BUCKET_NAME")
	publicURL := os.Getenv("R2_PUBLIC_URL")

	if accountID == "" || accessKey == "" || secretKey == "" || bucket == "" {
		return fmt.Errorf("R2 config incomplete: R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME required")
	}

	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	c := s3.New(s3.Options{
		BaseEndpoint: aws.String(endpoint),
		Credentials:  credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		Region:       "auto",
	})

	Default = &Client{s3: c, bucket: bucket, publicURL: strings.TrimRight(publicURL, "/")}
	return nil
}

type ImageItem struct {
	Key          string    `json:"key"`
	URL          string    `json:"url"`
	Size         int64     `json:"size"`
	LastModified time.Time `json:"last_modified"`
}

func (c *Client) List(ctx context.Context, prefix string) ([]ImageItem, error) {
	var items []ImageItem
	var contToken *string

	for {
		out, err := c.s3.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
			Bucket:            aws.String(c.bucket),
			Prefix:            aws.String(prefix),
			ContinuationToken: contToken,
		})
		if err != nil {
			return nil, err
		}
		for _, obj := range out.Contents {
			items = append(items, ImageItem{
				Key:          aws.ToString(obj.Key),
				URL:          c.publicURL + "/" + aws.ToString(obj.Key),
				Size:         aws.ToInt64(obj.Size),
				LastModified: aws.ToTime(obj.LastModified),
			})
		}
		if !aws.ToBool(out.IsTruncated) {
			break
		}
		contToken = out.NextContinuationToken
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].LastModified.After(items[j].LastModified)
	})
	return items, nil
}

func (c *Client) Upload(ctx context.Context, key string, body io.Reader, contentType string) (ImageItem, error) {
	_, err := c.s3.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return ImageItem{}, err
	}
	return ImageItem{
		Key:          key,
		URL:          c.publicURL + "/" + key,
		LastModified: time.Now(),
	}, nil
}

func (c *Client) Delete(ctx context.Context, key string) error {
	_, err := c.s3.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	return err
}

func (c *Client) DeleteMany(ctx context.Context, keys []string) error {
	for _, k := range keys {
		if err := c.Delete(ctx, k); err != nil {
			return err
		}
	}
	return nil
}

type GetObjectResult struct {
	Body        io.ReadCloser
	ContentType string
}

func (c *Client) GetObject(ctx context.Context, key string) (*GetObjectResult, error) {
	out, err := c.s3.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}
	ct := ""
	if out.ContentType != nil {
		ct = *out.ContentType
	}
	return &GetObjectResult{Body: out.Body, ContentType: ct}, nil
}

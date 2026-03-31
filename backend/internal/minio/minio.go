package minio

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/url"
	"os"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var Client *minio.Client
var BucketName string
var PublicEndpoint string

func InitMinio() {
	endpoint := getEnv("MINIO_ENDPOINT", "localhost:9000")
	accessKey := getEnv("MINIO_ACCESS_KEY", "minioadmin")
	secretKey := getEnv("MINIO_SECRET_KEY", "minioadmin123")
	BucketName = getEnv("MINIO_BUCKET", "unboxing-videos")
	useSSL := getEnv("MINIO_USE_SSL", "false") == "true"
	PublicEndpoint = getEnv("MINIO_PUBLIC_ENDPOINT", "")

	var err error
	Client, err = minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		log.Fatalf("[MinIO] Failed to create client: %v", err)
	}

	// Auto-create bucket if not exists
	ctx := context.Background()
	exists, err := Client.BucketExists(ctx, BucketName)
	if err != nil {
		log.Fatalf("[MinIO] Failed to check bucket: %v", err)
	}
	if !exists {
		if err := Client.MakeBucket(ctx, BucketName, minio.MakeBucketOptions{}); err != nil {
			log.Fatalf("[MinIO] Failed to create bucket: %v", err)
		}
		log.Printf("[MinIO] Created bucket: %s", BucketName)
	}

	log.Printf("[MinIO] Connected to %s (bucket: %s, ssl: %v)", endpoint, BucketName, useSSL)
}

// UploadVideo uploads a video file to MinIO and returns the object key
func UploadVideo(objectKey string, reader io.Reader, size int64, contentType string) error {
	ctx := context.Background()
	_, err := Client.PutObject(ctx, BucketName, objectKey, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("failed to upload to MinIO: %w", err)
	}
	return nil
}

// GetVideoURL generates a presigned URL for video playback (24h expiry)
func GetVideoURL(objectKey string, contentDisposition string) (string, error) {
	ctx := context.Background()
	reqParams := make(url.Values)
	if contentDisposition != "" {
		reqParams.Set("response-content-disposition", contentDisposition)
	}
	presignedURL, err := Client.PresignedGetObject(ctx, BucketName, objectKey, 24*time.Hour, reqParams)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	// If a public endpoint is defined, replace the internal docker host with the public one
	if PublicEndpoint != "" {
		presignedURL.Host = PublicEndpoint
		// Also respect the public SSL setting for the generated URL scheme
		publicUseSSL := os.Getenv("MINIO_PUBLIC_USE_SSL") == "true"
		if publicUseSSL {
			presignedURL.Scheme = "https"
		} else {
			presignedURL.Scheme = "http"
		}
	}

	return presignedURL.String(), nil
}

// DeleteVideo removes a video from MinIO
func DeleteVideo(objectKey string) error {
	ctx := context.Background()
	return Client.RemoveObject(ctx, BucketName, objectKey, minio.RemoveObjectOptions{})
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

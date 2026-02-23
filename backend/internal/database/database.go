package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"warehouse-report-monitoring/internal/models"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	driver := getEnv("DB_DRIVER", "sqlite")

	var err error
	if driver == "postgres" {
		host := getEnv("DB_HOST", "localhost")
		port := getEnv("DB_PORT", "5432")
		user := getEnv("DB_USER", "postgres")
		pass := getEnv("DB_PASSWORD", "postgres")
		name := getEnv("DB_NAME", "warehouse_report")

		dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			host, port, user, pass, name)

		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err != nil {
			log.Fatalf("Failed to connect to PostgreSQL: %v", err)
		}
		log.Println("[DB] Connected to PostgreSQL")
	} else {
		dbPath := getEnv("DB_PATH", "./warehouse.db")
		DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err != nil {
			log.Fatalf("Failed to open SQLite: %v", err)
		}
		log.Println("[DB] Connected to SQLite:", dbPath)
	}
}

func AutoMigrate() {
	err := DB.AutoMigrate(
		&models.Arrival{},
		&models.Transaction{},
		&models.Vas{},
		&models.Dcc{},
		&models.Damage{},
		&models.Soh{},
		&models.QcReturn{},
		&models.Location{},
		&models.Attendance{},
		&models.Employee{},
		&models.ProjectProductivity{},
		&models.Unloading{},
		&models.User{},
		&models.Schedule{},
		&models.BeritaAcara{},
	)
	if err != nil {
		log.Fatalf("Failed to auto-migrate: %v", err)
	}
	log.Println("[DB] Auto-migration complete")
}

// SeedDefaultUsers creates default accounts if none exist
func SeedDefaultUsers() {
	var count int64
	DB.Model(&models.User{}).Count(&count)
	if count > 0 {
		return
	}

	defaults := []struct {
		Username string
		EnvKey   string
		Role     string
	}{
		{"supervisor", "SEED_PASSWORD_SUPERVISOR", "supervisor"},
		{"leader", "SEED_PASSWORD_LEADER", "leader"},
		{"admin.inbound", "SEED_PASSWORD_ADMIN_INBOUND", "admin_inbound"},
		{"admin.inventory", "SEED_PASSWORD_ADMIN_INVENTORY", "admin_inventory"},
	}

	log.Println("═══════════════════════════════════════════════")
	log.Println("[DB] Creating default user accounts...")

	for _, d := range defaults {
		password := os.Getenv(d.EnvKey)
		if password == "" {
			password = generateRandomPassword(12)
			log.Printf("[DB] ⚠ %s: generated password = %s (set %s env to override)", d.Username, password, d.EnvKey)
		} else {
			log.Printf("[DB] ✓ %s: password set from env %s", d.Username, d.EnvKey)
		}
		hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		DB.Create(&models.User{
			Username: d.Username,
			Password: string(hash),
			Role:     d.Role,
		})
	}

	log.Println("[DB] Default users seeded — CHANGE PASSWORDS after first login!")
	log.Println("═══════════════════════════════════════════════")
}

// generateRandomPassword creates a random alphanumeric password of given length
func generateRandomPassword(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
		// add small variation
		time.Sleep(time.Nanosecond)
	}
	return string(b)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

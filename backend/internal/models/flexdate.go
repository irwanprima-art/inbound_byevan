package models

import (
	"database/sql/driver"
	"fmt"
	"strings"
	"time"
)

// FlexDate is a custom type that accepts multiple date/datetime string formats
// on JSON input (M/D/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.) and normalizes them.
//
// - JSON output: "YYYY-MM-DD" for date-only, "YYYY-MM-DD HH:MM:SS" if time is present
// - DB storage: TEXT column (same as before) with normalized format
// - Empty string input → stored as empty string
type FlexDate struct {
	Time  time.Time
	Valid bool // false if empty or unparseable
}

// Supported input formats, tried in order
var flexDateFormats = []string{
	// Date + time
	"1/2/2006 15:04:05",
	"1/2/2006 15:04",
	"01/02/2006 15:04:05",
	"01/02/2006 15:04",
	"2006-01-02 15:04:05",
	"2006-01-02T15:04:05Z",
	"2006-01-02T15:04:05",
	"2/1/2006 15:04:05",
	"02/01/2006 15:04:05",
	// Date only
	"1/2/2006",
	"01/02/2006",
	"2006-01-02",
	"2/1/2006",
	"02/01/2006",
}

// ParseFlexDate tries to parse a date string using multiple formats.
func ParseFlexDate(s string) FlexDate {
	s = strings.TrimSpace(s)
	if s == "" {
		return FlexDate{}
	}
	for _, fmt := range flexDateFormats {
		t, err := time.Parse(fmt, s)
		if err == nil {
			return FlexDate{Time: t, Valid: true}
		}
	}
	return FlexDate{}
}

// String returns the normalized string representation.
func (fd FlexDate) String() string {
	if !fd.Valid {
		return ""
	}
	if fd.Time.Hour() == 0 && fd.Time.Minute() == 0 && fd.Time.Second() == 0 {
		return fd.Time.Format("2006-01-02")
	}
	return fd.Time.Format("2006-01-02 15:04:05")
}

// MarshalJSON outputs the normalized date string as JSON.
func (fd FlexDate) MarshalJSON() ([]byte, error) {
	s := fd.String()
	return []byte(`"` + s + `"`), nil
}

// UnmarshalJSON accepts multiple date formats from JSON input.
func (fd *FlexDate) UnmarshalJSON(data []byte) error {
	s := strings.Trim(string(data), `"`)
	if s == "" || s == "null" {
		fd.Valid = false
		fd.Time = time.Time{}
		return nil
	}
	*fd = ParseFlexDate(s)
	return nil
}

// Value implements driver.Valuer for database storage (stores as TEXT).
func (fd FlexDate) Value() (driver.Value, error) {
	return fd.String(), nil
}

// Scan implements sql.Scanner for reading from database.
func (fd *FlexDate) Scan(value interface{}) error {
	if value == nil {
		fd.Valid = false
		fd.Time = time.Time{}
		return nil
	}
	switch v := value.(type) {
	case string:
		*fd = ParseFlexDate(v)
	case []byte:
		*fd = ParseFlexDate(string(v))
	case time.Time:
		fd.Time = v
		fd.Valid = !v.IsZero()
	default:
		return fmt.Errorf("FlexDate.Scan: unsupported type %T", value)
	}
	return nil
}

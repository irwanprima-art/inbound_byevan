package models

import (
	"time"

	"gorm.io/gorm"
)

// NOTE: Date fields use FlexDate type (defined in flexdate.go)
// which accepts multiple input formats and normalizes to YYYY-MM-DD

// Arrival represents inbound arrival data
type Arrival struct {
	ID                   uint           `gorm:"primaryKey" json:"id"`
	Date                 FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	ScheduledArrivalTime FlexDate       `gorm:"column:scheduled_arrival_time;type:text" json:"scheduled_arrival_time"`
	ArrivalTime          FlexDate       `gorm:"column:arrival_time;type:text" json:"arrival_time"`
	FinishUnloadingTime  FlexDate       `gorm:"column:finish_unloading_time;type:text" json:"finish_unloading_time"`
	ReceiptNo            string         `gorm:"column:receipt_no" json:"receipt_no"`
	PoNo                 string         `gorm:"column:po_no" json:"po_no"`
	Brand                string         `gorm:"column:brand" json:"brand" binding:"required"`
	PlanQty              int            `gorm:"column:plan_qty" json:"plan_qty" binding:"min=0"`
	PoQty                int            `gorm:"column:po_qty" json:"po_qty" binding:"min=0"`
	Operator             string         `gorm:"column:operator" json:"operator"`
	Note                 string         `gorm:"column:note" json:"note"`
	ItemType             string         `gorm:"column:item_type;default:Barang Jual" json:"item_type"`
	KingdeeStatus        string         `gorm:"column:kingdee_status" json:"kingdee_status"`
	DatePublishDO        FlexDate       `gorm:"column:date_publish_do;type:text" json:"date_publish_do"`
	RemarksPublishDO     string         `gorm:"column:remarks_publish_do" json:"remarks_publish_do"`
	Urgensi              string         `gorm:"column:urgensi" json:"urgensi"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
	DeletedAt            gorm.DeletedAt `gorm:"index" json:"-"`
}

// Transaction represents inbound transaction data
type Transaction struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	Date            FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	TimeTransaction FlexDate       `gorm:"column:time_transaction;type:text" json:"time_transaction"`
	ReceiptNo       string         `gorm:"column:receipt_no" json:"receipt_no"`
	Sku             string         `gorm:"column:sku" json:"sku" binding:"required"`
	OperateType     string         `gorm:"column:operate_type" json:"operate_type"`
	Qty             int            `gorm:"column:qty" json:"qty" binding:"min=0"`
	Operator        string         `gorm:"column:operator" json:"operator"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// Vas represents VAS (Value Added Service) data
type Vas struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Date      FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	StartTime FlexDate       `gorm:"column:start_time;type:text" json:"start_time"`
	EndTime   FlexDate       `gorm:"column:end_time;type:text" json:"end_time"`
	Brand     string         `gorm:"column:brand" json:"brand" binding:"required"`
	Sku       string         `gorm:"column:sku" json:"sku" binding:"required"`
	VasType   string         `gorm:"column:vas_type" json:"vas_type" binding:"required"`
	Qty       int            `gorm:"column:qty" json:"qty" binding:"min=0"`
	Operator  string         `gorm:"column:operator" json:"operator"`
	ItemType  string         `gorm:"column:item_type;default:Barang Jual" json:"item_type"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Dcc represents Daily Cycle Count data
type Dcc struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	Date              FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	PhyInv            string         `gorm:"column:phy_inv" json:"phy_inv"`
	Zone              string         `gorm:"column:zone" json:"zone"`
	Location          string         `gorm:"column:location" json:"location" binding:"required"`
	Owner             string         `gorm:"column:owner" json:"owner"`
	Sku               string         `gorm:"column:sku" json:"sku" binding:"required"`
	Brand             string         `gorm:"column:brand" json:"brand"`
	Description       string         `gorm:"column:description" json:"description"`
	SysQty            int            `gorm:"column:sys_qty" json:"sys_qty"`
	PhyQty            int            `gorm:"column:phy_qty" json:"phy_qty"`
	Variance          int            `gorm:"column:variance" json:"variance"`
	Operator          string         `gorm:"column:operator" json:"operator"`
	ReconcileSysQty   *int           `gorm:"column:reconcile_sys_qty" json:"reconcile_sys_qty"`
	ReconcilePhyQty   *int           `gorm:"column:reconcile_phy_qty" json:"reconcile_phy_qty"`
	ReconcileVariance *int           `gorm:"column:reconcile_variance" json:"reconcile_variance"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

// Damage represents project damage data
type Damage struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Date         FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	Brand        string         `gorm:"column:brand" json:"brand"`
	Sku          string         `gorm:"column:sku" json:"sku" binding:"required"`
	Description  string         `gorm:"column:description" json:"description"`
	Qty          int            `gorm:"column:qty" json:"qty" binding:"min=0"`
	DamageNote   string         `gorm:"column:damage_note" json:"damage_note"`
	DamageReason string         `gorm:"column:damage_reason" json:"damage_reason"`
	Operator     string         `gorm:"column:operator" json:"operator"`
	Owner        string         `gorm:"column:owner" json:"owner"`
	QcBy         string         `gorm:"column:qc_by" json:"qc_by"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// Soh represents Stock on Hand data
type Soh struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	Location         string         `gorm:"column:location" json:"location" binding:"required"`
	LocationCategory string         `gorm:"column:location_category" json:"location_category"`
	Sku              string         `gorm:"column:sku" json:"sku" binding:"required"`
	SkuCategory      string         `gorm:"column:sku_category" json:"sku_category"`
	Brand            string         `gorm:"column:brand" json:"brand"`
	Zone             string         `gorm:"column:zone" json:"zone"`
	LocationType     string         `gorm:"column:location_type" json:"location_type"`
	Owner            string         `gorm:"column:owner" json:"owner"`
	Status           string         `gorm:"column:status" json:"status"`
	Qty              int            `gorm:"column:qty" json:"qty"`
	WhArrivalDate    FlexDate       `gorm:"column:wh_arrival_date;type:text" json:"wh_arrival_date"`
	ReceiptNo        string         `gorm:"column:receipt_no" json:"receipt_no"`
	MfgDate          FlexDate       `gorm:"column:mfg_date;type:text" json:"mfg_date"`
	ExpDate          FlexDate       `gorm:"column:exp_date;type:text" json:"exp_date"`
	BatchNo          string         `gorm:"column:batch_no" json:"batch_no"`
	UpdateDate       FlexDate       `gorm:"column:update_date;type:text" json:"update_date"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// QcReturn represents QC return data
type QcReturn struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	QcDate      FlexDate       `gorm:"column:qc_date;type:text" json:"qc_date" binding:"required"`
	Receipt     string         `gorm:"column:receipt" json:"receipt"`
	ReturnDate  FlexDate       `gorm:"column:return_date;type:text" json:"return_date"`
	Owner       string         `gorm:"column:owner" json:"owner"`
	Brand       string         `gorm:"column:brand" json:"brand"`
	Sku         string         `gorm:"column:sku" json:"sku" binding:"required"`
	Description string         `gorm:"column:description" json:"description"`
	Qty         int            `gorm:"column:qty" json:"qty" binding:"min=0"`
	FromLoc     string         `gorm:"column:from_loc" json:"from_loc"`
	ToLoc       string         `gorm:"column:to_loc" json:"to_loc"`
	Status      string         `gorm:"column:status" json:"status"`
	Operator    string         `gorm:"column:operator" json:"operator"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// Location represents master location data
type Location struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	Location         string         `gorm:"column:location" json:"location" binding:"required"`
	LocationCategory string         `gorm:"column:location_category" json:"location_category"`
	Zone             string         `gorm:"column:zone" json:"zone"`
	LocationType     string         `gorm:"column:location_type" json:"location_type"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// MasterItem represents master item / SKU data
type MasterItem struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Sku         string         `gorm:"column:sku" json:"sku" binding:"required"`
	Description string         `gorm:"column:description" json:"description"`
	Brand       string         `gorm:"column:brand" json:"brand"`
	SkuCategory string         `gorm:"column:sku_category" json:"sku_category"`
	ItemClass   string         `gorm:"column:item_class" json:"item_class"`
	Price       float64        `gorm:"column:price" json:"price"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// Attendance represents manpower attendance data
type Attendance struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Date      FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	Nik       string         `gorm:"column:nik" json:"nik" binding:"required"`
	Name      string         `gorm:"column:name" json:"name" binding:"required"`
	Jobdesc   string         `gorm:"column:jobdesc" json:"jobdesc"`
	ClockIn   string         `gorm:"column:clock_in" json:"clock_in"`
	ClockOut  string         `gorm:"column:clock_out" json:"clock_out"`
	Status    string         `gorm:"column:status" json:"status"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Employee represents employee data
type Employee struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Nik       string         `gorm:"column:nik" json:"nik" binding:"required"`
	Name      string         `gorm:"column:name" json:"name" binding:"required"`
	Status    string         `gorm:"column:status" json:"status"`
	IsActive  string         `gorm:"column:is_active;default:Active" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// ProjectProductivity represents project productivity data
type ProjectProductivity struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Date      FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	Project   string         `gorm:"column:project" json:"project" binding:"required"`
	Activity  string         `gorm:"column:activity" json:"activity"`
	Operator  string         `gorm:"column:operator" json:"operator"`
	Qty       int            `gorm:"column:qty" json:"qty" binding:"min=0"`
	Duration  string         `gorm:"column:duration" json:"duration"`
	Status    string         `gorm:"column:status" json:"status"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Unloading represents inbound unloading data
type Unloading struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Date          FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	Brand         string         `gorm:"column:brand" json:"brand" binding:"required"`
	VehicleType   string         `gorm:"column:vehicle_type" json:"vehicle_type"`
	TotalVehicles int            `gorm:"column:total_vehicles" json:"total_vehicles" binding:"min=0"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// User represents auth user for JWT login
type User struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Username string `gorm:"uniqueIndex;not null" json:"username"`
	Password string `gorm:"not null" json:"-"`
	Role     string `gorm:"not null" json:"role"`
}

// Schedule represents manpower weekly schedule
type Schedule struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Date      FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	Nik       string         `gorm:"column:nik" json:"nik" binding:"required"`
	Name      string         `gorm:"column:name" json:"name"`
	Jobdesc   string         `gorm:"column:jobdesc" json:"jobdesc"`
	ClockIn   string         `gorm:"column:clock_in" json:"clock_in"`
	ClockOut  string         `gorm:"column:clock_out" json:"clock_out"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeritaAcara represents official warehouse report documents
type BeritaAcara struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	DocType   string         `gorm:"column:doc_type" json:"doc_type" binding:"required"`
	DocNumber string         `gorm:"column:doc_number;index" json:"doc_number"`
	Date      FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	Checker   string         `gorm:"column:checker" json:"checker"`
	Kepada    string         `gorm:"column:kepada" json:"kepada"`
	Dari      string         `gorm:"column:dari" json:"dari"`
	Items     string         `gorm:"column:items;type:text" json:"items"`
	Notes     string         `gorm:"column:notes" json:"notes"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// StockOpname represents stock opname records (same structure as Dcc)
type StockOpname struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Date        FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	PhyInv      string         `gorm:"column:phy_inv" json:"phy_inv"`
	Zone        string         `gorm:"column:zone" json:"zone"`
	Location    string         `gorm:"column:location" json:"location" binding:"required"`
	Owner       string         `gorm:"column:owner" json:"owner"`
	Sku         string         `gorm:"column:sku" json:"sku" binding:"required"`
	Brand       string         `gorm:"column:brand" json:"brand"`
	Description string         `gorm:"column:description" json:"description"`
	SysQty      int            `gorm:"column:sys_qty" json:"sys_qty"`
	PhyQty      int            `gorm:"column:phy_qty" json:"phy_qty"`
	Variance    int            `gorm:"column:variance" json:"variance"`
	Operator    string         `gorm:"column:operator" json:"operator"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// AdditionalMp represents additional manpower entries per date
type AdditionalMp struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Date         FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	AdditionalMp int            `gorm:"column:additional_mp" json:"additional_mp"`
	Tasks        string         `gorm:"column:tasks;type:text" json:"tasks"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// InboundRejection represents tolakan (rejected goods) in inbound
type InboundRejection struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Date         FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	Brand        string         `gorm:"column:brand" json:"brand"`
	Sku          string         `gorm:"column:sku" json:"sku"`
	SerialNumber string         `gorm:"column:serial_number" json:"serial_number"`
	Catatan      string         `gorm:"column:catatan" json:"catatan"`
	Qty          int            `gorm:"column:qty" json:"qty" binding:"min=0"`
	SourceDocNo  string         `gorm:"column:source_doc_no" json:"source_doc_no"` // BA doc_number ref
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// InboundCase represents inbound case tracking data
type InboundCase struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	Date       FlexDate       `gorm:"column:date;type:text" json:"date" binding:"required"`
	ReceiptNo  string         `gorm:"column:receipt_no" json:"receipt_no"`
	Brand      string         `gorm:"column:brand" json:"brand"`
	Case       string         `gorm:"column:case" json:"case"`
	Operator   string         `gorm:"column:operator" json:"operator"`
	Qty        int            `gorm:"column:qty" json:"qty" binding:"min=0"`
	Keterangan string         `gorm:"column:keterangan" json:"keterangan"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

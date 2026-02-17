<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QcReturn extends Model
{
    protected $fillable = [
        'date', 'receipt', 'return_date', 'brand', 'owner', 'sku',
        'qty', 'from_loc', 'to_loc', 'operator', 'status',
    ];
}

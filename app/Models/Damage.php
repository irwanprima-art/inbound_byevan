<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Damage extends Model
{
    protected $fillable = [
        'date', 'brand', 'sku', 'qty', 'note', 'reason', 'operator', 'qc_by',
    ];
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectProductivity extends Model
{
    protected $fillable = [
        'name', 'task', 'qty', 'date',
    ];
}

"use client";

import React from 'react';
import { TrendingUp, Users, Eye, CheckCircle, XCircle, Clock, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ApplicationStatsProps {
  stats: {
    totalApplications: number;
    totalInterviews: number;
    totalSelected: number;
    totalRejected: number;
    conversionRate: number;
    averageTimeToHire: number;
    topSkills: string[];
    recentActivity: {
      type: 'application' | 'interview' | 'selection' | 'rejection';
      count: number;
      change: number;
    }[];
  };
}

export default function ApplicationStats({ stats }: ApplicationStatsProps) {
  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${getChangeColor(stats.recentActivity[0]?.change || 0)}`}>
                {getChangeIcon(stats.recentActivity[0]?.change || 0)} {Math.abs(stats.recentActivity[0]?.change || 0)}%
              </span>
              <span className="text-sm text-gray-500 ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Interviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalInterviews}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${getChangeColor(stats.recentActivity[1]?.change || 0)}`}>
                {getChangeIcon(stats.recentActivity[1]?.change || 0)} {Math.abs(stats.recentActivity[1]?.change || 0)}%
              </span>
              <span className="text-sm text-gray-500 ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Selected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSelected}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${getChangeColor(stats.recentActivity[2]?.change || 0)}`}>
                {getChangeIcon(stats.recentActivity[2]?.change || 0)} {Math.abs(stats.recentActivity[2]?.change || 0)}%
              </span>
              <span className="text-sm text-gray-500 ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm font-medium text-green-600">
                ↗ 2.1%
              </span>
              <span className="text-sm text-gray-500 ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Average Time to Hire</p>
                <p className="text-lg font-semibold text-gray-900">{stats.averageTimeToHire} days</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Application to Interview</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(stats.totalInterviews / stats.totalApplications) * 100}%` }}></div>
                  </div>
                  <span className="text-sm font-medium">{Math.round((stats.totalInterviews / stats.totalApplications) * 100)}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Interview to Selection</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${(stats.totalSelected / stats.totalInterviews) * 100}%` }}></div>
                  </div>
                  <span className="text-sm font-medium">{Math.round((stats.totalSelected / stats.totalInterviews) * 100)}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall Success Rate</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${stats.conversionRate}%` }}></div>
                  </div>
                  <span className="text-sm font-medium">{stats.conversionRate}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Most Sought Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topSkills.map((skill, index) => (
                <div key={skill} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{skill}</span>
                  </div>
                  <Badge variant="secondary" className="bg-white">
                    {Math.floor(Math.random() * 50) + 20}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Application Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-6 bg-blue-50 rounded-xl border-2 border-blue-100">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-blue-600 mb-1">{stats.totalApplications}</p>
              <p className="text-sm text-gray-600">Applications</p>
            </div>
            
            <div className="text-center p-6 bg-green-50 rounded-xl border-2 border-green-100">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-green-600 mb-1">{stats.totalInterviews}</p>
              <p className="text-sm text-gray-600">Interviews</p>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-xl border-2 border-purple-100">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-purple-600 mb-1">{stats.totalSelected}</p>
              <p className="text-sm text-gray-600">Selected</p>
            </div>
            
            <div className="text-center p-6 bg-red-50 rounded-xl border-2 border-red-100">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-red-600 mb-1">{stats.totalRejected}</p>
              <p className="text-sm text-gray-600">Rejected</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

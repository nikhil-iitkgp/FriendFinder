"use client";

import React, { useState } from 'react';
import { Plus, Search, Filter, Download, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import JobCard from './JobCard';
import JobDetailsModal from './JobDetailsModal';
import ApplicationStats from './ApplicationStats';

// Sample data - replace with your actual data
const sampleJobs = [
  {
    id: "1",
    title: "Software Engineer",
    company: "CompanyXYZ",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    experience: "2-4 years",
    salary: "$70,000 - $100,000",
    deadline: "2025-09-25",
    description: "We are seeking a talented Software Engineer to join our dynamic development team. You will be responsible for building scalable web applications and contributing to our product development lifecycle.",
    requirements: ["JavaScript", "React", "Node.js", "MongoDB", "Git"],
    benefits: ["Health Insurance", "Remote Work", "Flexible Hours", "Learning Budget"],
    postedDate: "2025-08-01",
    applicants: 45,
    interviews: 12,
    selected: 3,
    rejected: 8,
    status: "active" as const
  },
  {
    id: "2", 
    title: "Product Manager",
    company: "CompanyXYZ",
    department: "Product",
    location: "San Francisco, CA",
    type: "Full-time",
    experience: "3-5 years",
    salary: "$90,000 - $130,000",
    deadline: "2025-09-30",
    description: "Looking for an experienced Product Manager to drive product strategy and work closely with engineering and design teams.",
    requirements: ["Product Strategy", "Agile", "Analytics", "Leadership"],
    benefits: ["Health Insurance", "Stock Options", "Gym Membership"],
    postedDate: "2025-08-15",
    applicants: 28,
    interviews: 8,
    selected: 2,
    rejected: 5,
    status: "active" as const
  }
];

const sampleStats = {
  totalApplications: 156,
  totalInterviews: 42,
  totalSelected: 12,
  totalRejected: 28,
  conversionRate: 7.7,
  averageTimeToHire: 18,
  topSkills: ["JavaScript", "React", "Python", "Product Management", "UI/UX Design"],
  recentActivity: [
    { type: 'application' as const, count: 156, change: 12.5 },
    { type: 'interview' as const, count: 42, change: 8.3 },
    { type: 'selection' as const, count: 12, change: 15.2 },
    { type: 'rejection' as const, count: 28, change: -5.1 }
  ]
};

export default function JobDashboard() {
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredJobs = sampleJobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Dashboard</h1>
              <p className="text-gray-600">Manage your job postings and track applications</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowStats(!showStats)}
                className="flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                {showStats ? 'Hide Stats' : 'View Stats'}
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create New Job
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search jobs by title, company, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        {showStats && (
          <div className="mb-8">
            <ApplicationStats stats={sampleStats} />
          </div>
        )}

        {/* Jobs Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Active Job Postings ({filteredJobs.length})
            </h2>
          </div>

          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms' : 'Create your first job posting to get started'}
                </p>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Job
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onViewDetails={setSelectedJob}
                  onEdit={(job) => console.log('Edit job:', job)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Job Details Modal */}
        <JobDetailsModal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          job={selectedJob || sampleJobs[0]}
        />
      </div>
    </div>
  );
}

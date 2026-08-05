'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Globe, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function PageManagement() {
  const queryClient = useQueryClient();

  const { data: pages, isLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: async () => (await fetch('/api/admin/pages')).json()
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      toast.success('Page deleted');
    }
  });

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">CMS Pages</h1>
          <p className="text-muted-foreground">Manage public facing pages and content</p>
        </div>
        <Link href="/admin/pages/editor">
          <Button className="bg-primary hover:bg-primary/90"><Plus className="mr-2 h-4 w-4"/> Create Page</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug (URL)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages?.map((page: any) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">/{page.slug}</TableCell>
                  <TableCell>
                    <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                      {page.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(page.updatedAt), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/${page.slug}`} target="_blank">
                       <Button variant="ghost" size="icon" title="View Live"><Eye className="h-4 w-4 text-muted-foreground"/></Button>
                    </Link>
                    <Link href={`/admin/pages/editor?id=${page.id}`}>
                       <Button variant="ghost" size="icon" title="Edit"><Edit className="h-4 w-4 text-primary"/></Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => { if(confirm('Delete page?')) deleteMutation.mutate(page.id) }}>
                       <Trash2 className="h-4 w-4 text-red-600"/>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

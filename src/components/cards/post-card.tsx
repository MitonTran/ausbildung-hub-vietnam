import { MessageCircle, ThumbsUp, Bookmark, Flag } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CommunityPost } from "@/types";
import { relativeTime } from "@/lib/utils";
import { categoryColor } from "@/lib/badge-colors";

export function PostCard({ post }: { post: CommunityPost }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Avatar src={post.author_avatar} alt={post.author_name} fallback={post.author_name.slice(0, 1)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{post.author_name}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{relativeTime(post.created_at)}</span>
              <Badge variant="default" className={`ml-auto text-[10px] ${categoryColor(post.category)}`}>
                {post.category}
              </Badge>
            </div>
            <h3 className="mt-2 text-sm font-semibold leading-snug">{post.title}</h3>
            <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{post.content}</p>
            {post.tags && post.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <Badge key={t} variant="tag" className="text-[10px]">
                    #{t}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <button className="flex items-center gap-1 hover:text-foreground">
                <ThumbsUp className="h-3.5 w-3.5" /> {post.like_count}
              </button>
              <button className="flex items-center gap-1 hover:text-foreground">
                <MessageCircle className="h-3.5 w-3.5" /> {post.comment_count} bình luận
              </button>
              <button className="flex items-center gap-1 hover:text-foreground">
                <Bookmark className="h-3.5 w-3.5" /> Lưu
              </button>
              <button className="ml-auto flex items-center gap-1 hover:text-destructive">
                <Flag className="h-3.5 w-3.5" /> Báo cáo
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

revoke delete on table "public"."events" from "anon";

revoke insert on table "public"."events" from "anon";

revoke references on table "public"."events" from "anon";

revoke select on table "public"."events" from "anon";

revoke trigger on table "public"."events" from "anon";

revoke truncate on table "public"."events" from "anon";

revoke update on table "public"."events" from "anon";

revoke delete on table "public"."events" from "authenticated";

revoke insert on table "public"."events" from "authenticated";

revoke references on table "public"."events" from "authenticated";

revoke select on table "public"."events" from "authenticated";

revoke trigger on table "public"."events" from "authenticated";

revoke truncate on table "public"."events" from "authenticated";

revoke update on table "public"."events" from "authenticated";

revoke delete on table "public"."events" from "service_role";

revoke insert on table "public"."events" from "service_role";

revoke references on table "public"."events" from "service_role";

revoke select on table "public"."events" from "service_role";

revoke trigger on table "public"."events" from "service_role";

revoke truncate on table "public"."events" from "service_role";

revoke update on table "public"."events" from "service_role";

revoke delete on table "public"."matches" from "anon";

revoke insert on table "public"."matches" from "anon";

revoke references on table "public"."matches" from "anon";

revoke select on table "public"."matches" from "anon";

revoke trigger on table "public"."matches" from "anon";

revoke truncate on table "public"."matches" from "anon";

revoke update on table "public"."matches" from "anon";

revoke delete on table "public"."matches" from "authenticated";

revoke insert on table "public"."matches" from "authenticated";

revoke references on table "public"."matches" from "authenticated";

revoke select on table "public"."matches" from "authenticated";

revoke trigger on table "public"."matches" from "authenticated";

revoke truncate on table "public"."matches" from "authenticated";

revoke update on table "public"."matches" from "authenticated";

revoke delete on table "public"."matches" from "service_role";

revoke insert on table "public"."matches" from "service_role";

revoke references on table "public"."matches" from "service_role";

revoke select on table "public"."matches" from "service_role";

revoke trigger on table "public"."matches" from "service_role";

revoke truncate on table "public"."matches" from "service_role";

revoke update on table "public"."matches" from "service_role";

revoke delete on table "public"."players" from "anon";

revoke insert on table "public"."players" from "anon";

revoke references on table "public"."players" from "anon";

revoke select on table "public"."players" from "anon";

revoke trigger on table "public"."players" from "anon";

revoke truncate on table "public"."players" from "anon";

revoke update on table "public"."players" from "anon";

revoke delete on table "public"."players" from "authenticated";

revoke insert on table "public"."players" from "authenticated";

revoke references on table "public"."players" from "authenticated";

revoke select on table "public"."players" from "authenticated";

revoke trigger on table "public"."players" from "authenticated";

revoke truncate on table "public"."players" from "authenticated";

revoke update on table "public"."players" from "authenticated";

revoke delete on table "public"."players" from "service_role";

revoke insert on table "public"."players" from "service_role";

revoke references on table "public"."players" from "service_role";

revoke select on table "public"."players" from "service_role";

revoke trigger on table "public"."players" from "service_role";

revoke truncate on table "public"."players" from "service_role";

revoke update on table "public"."players" from "service_role";

alter table "public"."events" enable row level security;




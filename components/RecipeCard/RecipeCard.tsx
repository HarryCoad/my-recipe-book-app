import { ReactNode } from 'react';
import Link from 'next/link';
import styles from './RecipeCard.module.scss';
import {
  IconChevronRight,
  IconFlame,
  IconMessage2,
  IconPizza,
  IconSlice,
  IconToolsKitchen3,
  IconUser,
} from '@tabler/icons-react';
import { Button, Text, ThemeIcon, VisuallyHidden } from '@mantine/core';
import { BadgeLink } from '@/components/TooltipLink/TooltipLink';
import { reviewSuggestionsPath } from '@/helpers/constants';
import { convertMinutesToHoursAndMinutes } from '@/helpers/convertMin';
import { RecipeSearchResult } from '@/types/recipe';

// The rest are counted, as "+2"
const TAGS_SHOWN = 3;

type RecipeCardProps = {
  recipe: RecipeSearchResult;
  // Where the card goes, e.g. `/recipes/<id>`
  href: string;
  // Shows a "Your recipe" badge, for lists that mix the user's recipes with other people's
  isOwn?: boolean;
  // Shown in the top right corner, such as a save button
  action?: ReactNode;
};

// No client code, so it renders on the server unless a client component uses it. Clicking
// anywhere on the card opens the recipe. The title is the link, so that's what screen readers
// announce, rather than the whole card
export function RecipeCard({ recipe, href, isOwn, action }: RecipeCardProps) {
  const pending = recipe.pendingSuggestions;
  const moreTags = recipe.tags.length - TAGS_SHOWN;

  return (
    <article className={styles.card}>
      {/* Recipes don't have images yet, so show a placeholder */}
      <div className={styles.imageArea}>
        <div className={styles.image} aria-hidden>
          <IconPizza stroke={1.5} size={40} />
        </div>
        {/* An icon rather than words, over the image's corner. Hovering says what it means, so it
            sits above the card's link */}
        {isOwn && (
          <ThemeIcon
            variant="filled"
            color="blue"
            size="md"
            radius="xl"
            title="Your recipe"
            className={styles.ownIcon}
          >
            <IconUser size={14} aria-hidden />
            <VisuallyHidden>Your recipe</VisuallyHidden>
          </ThemeIcon>
        )}
      </div>

      <Text size="lg" fw={600} className={styles.title}>
        <Link href={href} className={styles.link}>
          {recipe.title}
        </Link>
      </Text>

      {(action || pending > 0) && (
        <div className={`${styles.action} ${styles.onTop}`}>
          {action}
          {/* Only the author gets a count, and it goes straight to reviewing them */}
          {pending > 0 && (
            <BadgeLink
              label="Review suggestions"
              ariaLabel={`${pending} ${pending === 1 ? 'suggestion' : 'suggestions'} waiting for review`}
              href={reviewSuggestionsPath(recipe.id)}
              leftSection={<IconMessage2 size={12} />}
            >
              {pending}
            </BadgeLink>
          )}
        </div>
      )}

      {recipe.description && (
        <Text size="sm" c="dimmed" className={styles.description}>
          {recipe.description}
        </Text>
      )}

      <div className={styles.stats}>
        <span className={styles.iconInfo} title="Category">
          {recipe.category}
        </span>
        {/* 0 or null when there's no prep */}
        {!!recipe.prepTime && (
          <span className={styles.iconInfo} title="Prep time">
            <IconSlice stroke={1.5} size={14} aria-hidden />
            <VisuallyHidden>Prep</VisuallyHidden>
            {convertMinutesToHoursAndMinutes(recipe.prepTime)}
          </span>
        )}
        {recipe.cookTime > 0 && (
          <span className={styles.iconInfo} title="Cook time">
            <IconFlame stroke={1.5} size={14} aria-hidden />
            <VisuallyHidden>Cook</VisuallyHidden>
            {convertMinutesToHoursAndMinutes(recipe.cookTime)}
          </span>
        )}
        <span className={styles.iconInfo} title="Serves">
          <IconToolsKitchen3 stroke={1.5} size={14} aria-hidden />
          <VisuallyHidden>Serves</VisuallyHidden>
          {recipe.serves}
        </span>
      </div>

      {recipe.tags.length > 0 && (
        <div className={styles.tags}>
          {recipe.tags.slice(0, TAGS_SHOWN).map((tag) => (
            <span className={styles.tag} key={tag}>
              {tag}
            </span>
          ))}
          {moreTags > 0 && (
            // The rest are listed when hovered
            <span className={styles.moreTags} title={recipe.tags.slice(TAGS_SHOWN).join(', ')}>
              +{moreTags}
              <VisuallyHidden> more {moreTags === 1 ? 'tag' : 'tags'}</VisuallyHidden>
            </span>
          )}
        </div>
      )}

      {/* Only looks like a button: it sits under the card's link, which is what gets clicked, so
          it isn't a second link for keyboards and screen readers. Large screens only */}
      <Button
        component="span"
        aria-hidden
        variant="outline"
        color="orange"
        rightSection={<IconChevronRight stroke={2} size={15} />}
        className={styles.view}
      >
        View recipe
      </Button>
    </article>
  );
}

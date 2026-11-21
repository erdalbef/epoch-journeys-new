-- Epoch AI Commercial Evidence Registry
-- Protect original Finance Documents after registration.
--
-- Applies only after SupplierCommercialEvidence exists.
-- Registration obtains a FOR UPDATE lock on the source
-- FinanceDocument row before creating evidence.
--
-- Document modification also obtains a row lock.
-- The trigger checks evidence references before permitting
-- UPDATE or DELETE.
--
-- All updates are blocked for registered evidence documents.
-- Amendments should use a new document and evidence version.

CREATE OR REPLACE FUNCTION
  public.prevent_registered_evidence_document_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public."SupplierCommercialEvidence" e
    WHERE
      e."sourceDocumentId" = OLD."id"
      OR e."acceptanceDocumentId" = OLD."id"
  ) THEN
    RAISE EXCEPTION
      'Registered commercial evidence document % cannot be modified or deleted',
      OLD."id"
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER registered_evidence_document_immutable
BEFORE UPDATE OR DELETE
ON public."FinanceDocument"
FOR EACH ROW
EXECUTE FUNCTION
  public.prevent_registered_evidence_document_changes();
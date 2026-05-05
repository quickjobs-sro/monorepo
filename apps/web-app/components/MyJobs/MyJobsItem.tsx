"use client";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@ui/components/core/menubar";
import { API } from "@ui/hooks";
import { EllipsisVertical } from "lucide-react";
import { Job } from "quickjobs-api-wrapper";
import { useMemo, useState } from "react";
import { AreYouSureDialog } from "../dialogs/AreYouSureDialog";
import { NewJobDialog } from "../dialogs/NewEditJobDialog";

const JOB_DETAIL_URL = "https://jobs.quickjobs.cz/detail/";

interface MyJobsItemProps {
  children?: React.ReactNode;
}
export const MyJobsItem = ({ children }: MyJobsItemProps) => {
  return <div className={"flex flex-col w-full"}>{children}</div>;
};

MyJobsItem.Header = (job: Partial<Job>) => {
  const [state, setState] = useState({
    open: false,
    isEditingDescription: false,
    similarJob: false,
    isDeleting: false,
  });
  const isActive = useMemo(() => job.status === "active", [job.status]);

  return (
    <div className="flex justify-between w-full px-4 pt-4 relative">
      <Menubar className="border-0 p-0 bg-transparent absolute top-4 right-4">
        <MenubarMenu>
          <MenubarTrigger className="border-0 px-1  ">
            <EllipsisVertical />
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={() => {
                window.open(`${JOB_DETAIL_URL + job.id}`, "_blank");
              }}
            >
              Jak to vidí uchazeči
            </MenubarItem>
            {isActive && (
              <MenubarItem
                onClick={() =>
                  setState({
                    ...state,
                    isEditingDescription: true,
                    similarJob: false,
                    open: true,
                  })
                }
              >
                Upravit popis inzerátu
              </MenubarItem>
            )}
            <MenubarItem
              onClick={() =>
                setState({
                  ...state,
                  similarJob: true,
                  isEditingDescription: false,
                  open: true,
                })
              }
            >
              Vydat podobný inzerát
            </MenubarItem>
            {isActive && (
              <MenubarItem
                onClick={() => {
                  setState({
                    ...state,
                    isDeleting: true,
                  });
                }}
              >
                Zrušit inzerát
              </MenubarItem>
            )}
          </MenubarContent>
        </MenubarMenu>
        <NewJobDialog
          key={`${state.open}-${state.isEditingDescription}-${state.similarJob}`}
          open={state.open}
          setOpen={(open) => setState({ ...state, open })}
          job={job}
          isEditingDescription={state.isEditingDescription}
          isSimilarJob={state.similarJob}
        />
      </Menubar>
      <AreYouSureDialog
        title="Opravdu chcete zrušit inzerát?"
        description="Ke zrušenému inzerátu se už nebudou moci hlásit další uchazeči. Uchazeči, o které jste projevili zájem, zůstanou v seznamu."
        confirmButtonProps={{ children: "Ano, chci zrušit inzerát" }}
        cancelButtonProps={{ children: "Ponechat inzerát" }}
        onConfirm={async () => {
          if (job.id) {
            try {
              await API.jobs.jobAction(job.id, "cancel");
              window.location.reload();
            } catch (error) {
              console.error(error);
            }
          }
        }}
        open={state.isDeleting}
        setOpen={(open) => setState((prev) => ({ ...prev, isDeleting: open }))}
      />
    </div>
  );
};

MyJobsItem.Content = ({ children }: MyJobsItemProps) => {
  return <div className="mt-4 px-4">{children}</div>;
};

MyJobsItem.Footer = ({ children }: MyJobsItemProps) => {
  return <div className="mt-2 border-b pt-2 w-full px-4">{children}</div>;
};

// Usage example:
/*
export const Example = ({ item }: { item: Partial<Job> }) => {
  return (
    <MyJobsItem>
      <MyJobsItem.Header item={item} />
      <MyJobsItem.Content>
        // Your content here
      </MyJobsItem.Content>
      <MyJobsItem.Footer>
        // Your footer content here
      </MyJobsItem.Footer>
    </MyJobsItem>
  );
};
*/

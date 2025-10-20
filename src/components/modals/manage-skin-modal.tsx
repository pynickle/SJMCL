import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalProps,
  Radio,
  RadioGroup,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuUpload } from "react-icons/lu";
import SkinPreview from "@/components/skin-preview";
import { useLauncherConfig } from "@/contexts/config";
import { useGlobalData } from "@/contexts/global-data";
import { useToast } from "@/contexts/toast";
import { SkinModel, TextureType } from "@/enums/account";
import { PresetSkinType, Texture } from "@/models/account";
import { AccountService } from "@/services/account";
import { base64ImgSrc } from "@/utils/string";

type SkinType = PresetSkinType | "default" | "upload";

interface ManageSkinModalProps extends Omit<ModalProps, "children"> {
  playerId: string;
  skin?: Texture;
  cape?: Texture;
}

const ManageSkinModal: React.FC<ManageSkinModalProps> = ({
  playerId,
  isOpen,
  onClose,
  skin,
  cape,
  ...modalProps
}) => {
  const [selectedSkin, setSelectedSkin] = useState<SkinType>("default");
  const [uploadSkinFilePath, setUploadSkinFilePath] = useState<string | null>(
    null
  );
  const [uploadCapeFilePath, setUploadCapeFilePath] = useState<string | null>(
    null
  );
  const [skinModel, setSkinModel] = useState<SkinModel>(SkinModel.Default);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { t } = useTranslation();
  const { config } = useLauncherConfig();
  const { getPlayerList } = useGlobalData();
  const toast = useToast();
  const primaryColor = config.appearance.theme.primaryColor;

  const skinOptions = {
    default: base64ImgSrc(skin?.image || ""),
    steve: "/images/skins/steve.png",
    alex: "/images/skins/alex.png",
    upload: uploadSkinFilePath ? convertFileSrc(uploadSkinFilePath) : "",
  };

  useEffect(() => {
    setSelectedSkin(skin?.preset || "default");
  }, [skin]);

  useEffect(() => {
    if (!isOpen && selectedSkin === "upload") {
      setSelectedSkin(skin?.preset || "default");
      setUploadSkinFilePath(null);
      setUploadCapeFilePath(null);
      setSkinModel(SkinModel.Default);
    }
  }, [isOpen, selectedSkin, skin?.preset]);

  const handleSave = async () => {
    if (selectedSkin === "default") {
      return;
    }
    if (selectedSkin !== "upload") {
      setIsLoading(true);
      try {
        const resp = await AccountService.updatePlayerSkinOfflinePreset(
          playerId,
          selectedSkin
        );
        if (resp.status === "success") {
          toast({
            title: resp.message,
            status: "success",
          });
          getPlayerList(true);
          onClose();
        } else {
          toast({
            title: resp.message,
            description: resp.details,
            status: "error",
          });
        }
      } finally {
        setIsLoading(false);
      }
    } else if (uploadSkinFilePath) {
      setIsLoading(true);
      try {
        const skinResp = await AccountService.updatePlayerSkinOfflineLocal(
          playerId,
          uploadSkinFilePath,
          TextureType.Skin,
          skinModel
        );
        if (skinResp.status === "success") {
          if (uploadCapeFilePath) {
            const capeResp = await AccountService.updatePlayerSkinOfflineLocal(
              playerId,
              uploadCapeFilePath,
              TextureType.Cape,
              SkinModel.Default
            );
            if (capeResp.status !== "success") {
              toast({
                title: capeResp.message,
                description: capeResp.details,
                status: "error",
              });
              throw new Error("Cape upload failed");
            }
          }
          toast({
            title: skinResp.message,
            status: "success",
          });
        } else {
          toast({
            title: skinResp.message,
            description: skinResp.details,
            status: "error",
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
        getPlayerList(true);
        onClose();
      }
    }
  };

  const handleUploadSkinFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: t("General.dialog.filterName.image"),
          extensions: ["png"],
        },
      ],
    });
    if (selected) {
      setUploadSkinFilePath(selected);
    }
  };

  const handleUploadCapeFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: t("General.dialog.filterName.image"),
          extensions: ["png"],
        },
      ],
    });
    if (selected) {
      setUploadCapeFilePath(selected);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "md", lg: "lg", xl: "xl" }}
      {...modalProps}
    >
      <ModalOverlay />
      <ModalContent width="100%">
        <ModalHeader>{t("ManageSkinModal.skinManage")}</ModalHeader>
        <ModalCloseButton />
        <ModalBody width="100%">
          <Grid templateColumns="3fr 2fr" gap={4} h="320px">
            <Flex justify="center" align="center" height="100%">
              <SkinPreview
                skinSrc={skinOptions[selectedSkin]}
                capeSrc={
                  selectedSkin === "default" && cape
                    ? base64ImgSrc(cape.image)
                    : selectedSkin === "upload" && uploadCapeFilePath
                      ? convertFileSrc(uploadCapeFilePath)
                      : undefined
                }
                width={270}
                height={310}
                showControlBar
              />
            </Flex>

            <VStack spacing={2} alignItems="flex-start" minWidth="100%">
              <RadioGroup
                value={selectedSkin}
                onChange={(skinType: SkinType) => setSelectedSkin(skinType)}
              >
                <VStack spacing={2} alignItems="flex-start">
                  {Object.keys(skinOptions).map((key) => (
                    <Radio key={key} value={key} colorScheme={primaryColor}>
                      <Text fontSize="sm">{t(`ManageSkinModal.${key}`)}</Text>
                    </Radio>
                  ))}
                </VStack>
              </RadioGroup>
              {selectedSkin === "upload" && (
                <VStack spacing={2} alignItems="flex-start" width="100%">
                  <FormControl>
                    <FormLabel htmlFor="uploadSkin">
                      {t("ManageSkinModal.uploadSkin")}
                    </FormLabel>
                    <Button
                      id="uploadSkin"
                      onClick={handleUploadSkinFile}
                      variant="outline"
                      leftIcon={<LuUpload />}
                      width="100%"
                      size="xs"
                    >
                      <Text
                        textOverflow="ellipsis"
                        isTruncated
                        overflow="hidden"
                        flex={1}
                      >
                        {uploadSkinFilePath || t("ManageSkinModal.upload")}
                      </Text>
                    </Button>
                  </FormControl>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel htmlFor="thinModel" mb={0}>
                      {t("ManageSkinModal.thinModel")}
                    </FormLabel>
                    <Switch
                      id="thinModel"
                      isChecked={skinModel === SkinModel.Slim}
                      onChange={(e) =>
                        setSkinModel(
                          e.target.checked ? SkinModel.Slim : SkinModel.Default
                        )
                      }
                    ></Switch>
                  </FormControl>
                  <FormControl>
                    <FormLabel htmlFor="uploadCape">
                      {t("ManageSkinModal.uploadCape")}
                    </FormLabel>
                    <Button
                      id="uploadCape"
                      onClick={handleUploadCapeFile}
                      variant="outline"
                      leftIcon={<LuUpload />}
                      width="100%"
                      size="xs"
                    >
                      <Text
                        textOverflow="ellipsis"
                        isTruncated
                        overflow="hidden"
                        flex={1}
                      >
                        {uploadCapeFilePath || t("ManageSkinModal.upload")}
                      </Text>
                    </Button>
                  </FormControl>
                </VStack>
              )}
            </VStack>
          </Grid>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("General.cancel")}
          </Button>
          <Button
            variant="solid"
            colorScheme={primaryColor}
            onClick={handleSave}
            isLoading={isLoading}
            disabled={
              selectedSkin === "default" ||
              (selectedSkin === "upload" && !uploadSkinFilePath) ||
              skin?.preset === selectedSkin
            }
          >
            {t("General.confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ManageSkinModal;
